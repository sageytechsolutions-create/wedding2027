import { z } from "zod";
import { db } from "./db";
import { currentStoreStatus } from "./store-hours";
import { siteUrl, stripe } from "./stripe";
import { quoteFulfillment, type FulfillmentQuote } from "./fulfillment";

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  address1: z.string().min(1).max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  giftMessage: z.string().max(300).optional(),
  items: z.array(cartLineSchema).min(1).max(50),
  // Vendors whose part of the order should use pre-Yom Tov priority delivery.
  priorityVendorIds: z.array(z.string()).max(50).default([]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface VendorGroupQuote {
  vendorId: string;
  vendorName: string;
  subtotal: number;
  quote: FulfillmentQuote;
  lines: { productId: string; name: string; unitPrice: number; quantity: number }[];
}

// Prices always come from the database, never from the client's cart.
export async function quoteCart(items: z.infer<typeof cartLineSchema>[], zip: string, now = new Date()) {
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true, vendor: { active: true } },
    include: { vendor: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<string, VendorGroupQuote & { perishable: boolean; vendor: (typeof products)[number]["vendor"] }>();

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) continue;
    let group = groups.get(product.vendorId);
    if (!group) {
      group = {
        vendorId: product.vendorId,
        vendorName: product.vendor.name,
        vendor: product.vendor,
        subtotal: 0,
        perishable: false,
        lines: [],
        quote: { available: false, reason: "" },
      };
      groups.set(product.vendorId, group);
    }
    group.subtotal += product.price * item.quantity;
    group.perishable ||= product.perishable;
    group.lines.push({ productId: product.id, name: product.name, unitPrice: product.price, quantity: item.quantity });
  }

  const result: (VendorGroupQuote & { commissionRate: number })[] = [];
  for (const g of groups.values()) {
    result.push({
      vendorId: g.vendorId,
      vendorName: g.vendorName,
      subtotal: g.subtotal,
      lines: g.lines,
      commissionRate: g.vendor.commissionRate,
      quote: quoteFulfillment(g.vendor, zip, g.subtotal, g.perishable, now),
    });
  }
  const missing = items.filter((i) => !byId.has(i.productId)).map((i) => i.productId);
  return { groups: result, missing };
}

function orderNumber(): string {
  return `KV-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
}

export class CheckoutError extends Error {}

// Creates the order and, when Stripe is configured, a Checkout Session to pay for it.
// Returns where to send the customer next.
export async function placeOrder(input: CheckoutInput): Promise<{ number: string; redirectUrl: string }> {
  const status = currentStoreStatus();
  if (!status.open) throw new CheckoutError(`We're closed for ${status.reason}. We reopen ${status.reopens}.`);

  const { groups, missing } = await quoteCart(input.items, input.zip);
  if (missing.length) throw new CheckoutError("Some items in your cart are no longer available.");

  const plans = groups.map((g) => {
    if (!g.quote.available) throw new CheckoutError(`${g.vendorName}: ${g.quote.reason}`);
    const q = g.quote;
    const wantsPriority = input.priorityVendorIds.includes(g.vendorId);
    if (wantsPriority && !q.priority) {
      throw new CheckoutError(`${g.vendorName}: priority holiday delivery is no longer available. Please review your order.`);
    }
    const p = wantsPriority ? q.priority! : null;
    const shippingFee = q.fee + (p?.fee ?? 0);
    const commission = Math.round(g.subtotal * g.commissionRate);
    return {
      group: g,
      shippingFee,
      data: {
        vendorId: g.vendorId,
        method: q.method,
        shipDate: new Date(`${p?.shipDate ?? q.shipDate}T00:00:00Z`),
        deliveryDate: new Date(`${p?.deliveryDate ?? q.deliveryDate}T00:00:00Z`),
        priority: p != null,
        holidayName: p?.holidayName ?? null,
        subtotal: g.subtotal,
        shippingFee,
        commission,
        // Vendor keeps shipping and priority fees to cover packaging, drivers and carriers.
        vendorPayout: g.subtotal - commission + shippingFee,
        items: { create: g.lines },
      },
    };
  });

  const subtotal = plans.reduce((s, p) => s + p.group.subtotal, 0);
  const shippingTotal = plans.reduce((s, p) => s + p.shippingFee, 0);
  const { items: _items, priorityVendorIds: _priority, ...customer } = input;

  const order = await db.order.create({
    data: {
      ...customer,
      number: orderNumber(),
      subtotal,
      shippingTotal,
      total: subtotal + shippingTotal,
      paymentStatus: stripe ? "pending" : "paid",
      vendorOrders: { create: plans.map((p) => p.data) },
    },
  });
  const orderUrl = `/orders/${order.number}?email=${encodeURIComponent(order.email)}`;
  if (!stripe) return { number: order.number, redirectUrl: orderUrl };

  const lineItems = plans.flatMap((p) => [
    ...p.group.lines.map((l) => ({
      quantity: l.quantity,
      price_data: { currency: "usd", unit_amount: l.unitPrice, product_data: { name: `${l.name} (${p.group.vendorName})` } },
    })),
    ...(p.shippingFee > 0
      ? [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: p.shippingFee,
            product_data: { name: `${p.data.priority ? "Priority holiday delivery" : "Delivery"}: ${p.group.vendorName}` },
          },
        }]
      : []),
  ]);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: lineItems,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      // Vendor payouts are sent as transfers in this group once the payment succeeds.
      payment_intent_data: { transfer_group: order.id, metadata: { orderId: order.id } },
      success_url: `${siteUrl()}${orderUrl}`,
      cancel_url: `${siteUrl()}/checkout?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });
  } catch (e) {
    console.error("Stripe checkout session failed", e);
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "expired" } });
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.");
  }
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return { number: order.number, redirectUrl: session.url! };
}

// Called from the Stripe webhook once Checkout has collected the money.
export async function markOrderPaid(sessionId: string, paymentIntentId: string) {
  const order = await db.order.findUnique({ where: { stripeSessionId: sessionId } });
  // Stripe retries webhooks, so this must be safe to run more than once.
  if (!order || order.paymentStatus === "paid") return;
  await db.order.update({ where: { id: order.id }, data: { paymentStatus: "paid", stripePaymentIntentId: paymentIntentId } });
  await sendPendingPayouts({ orderId: order.id });
}

// Transfers each vendor's payout to their Stripe account for paid orders that
// haven't been paid out yet. Vendors who haven't connected Stripe are skipped
// and picked up once they finish onboarding.
export async function sendPendingPayouts(where: { orderId?: string; vendorId?: string }) {
  if (!stripe) return;
  const pending = await db.vendorOrder.findMany({
    where: {
      ...where,
      stripeTransferId: null,
      status: { not: "cancelled" },
      order: { paymentStatus: "paid", stripePaymentIntentId: { not: null } },
      vendor: { stripeAccountId: { not: null }, stripePayoutsEnabled: true },
    },
    include: { order: true, vendor: true },
  });
  const chargeIds = new Map<string, string | undefined>();
  for (const vo of pending) {
    const intentId = vo.order.stripePaymentIntentId!;
    if (!chargeIds.has(intentId)) {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      chargeIds.set(intentId, typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id);
    }
    const chargeId = chargeIds.get(intentId);
    const transfer = await stripe.transfers.create(
      {
        amount: vo.vendorPayout,
        currency: "usd",
        destination: vo.vendor.stripeAccountId!,
        transfer_group: vo.orderId,
        // Ties the transfer to the charge so it can go out before the funds settle.
        ...(chargeId && { source_transaction: chargeId }),
        metadata: { orderNumber: vo.order.number, vendorOrderId: vo.id },
      },
      { idempotencyKey: `payout-${vo.id}` },
    );
    await db.vendorOrder.update({ where: { id: vo.id }, data: { stripeTransferId: transfer.id } });
  }
}

export async function markOrderExpired(sessionId: string) {
  await db.order.updateMany({ where: { stripeSessionId: sessionId, paymentStatus: "pending" }, data: { paymentStatus: "expired" } });
}

export const VENDOR_ORDER_STATUSES = [
  "pending",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
