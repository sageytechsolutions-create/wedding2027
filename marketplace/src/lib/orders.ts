import { z } from "zod";
import { db } from "./db";
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

export async function placeOrder(input: CheckoutInput) {
  const { groups, missing } = await quoteCart(input.items, input.zip);
  if (missing.length) throw new CheckoutError("Some items in your cart are no longer available.");
  const blocked = groups.find((g) => !g.quote.available);
  if (blocked && !blocked.quote.available) throw new CheckoutError(`${blocked.vendorName}: ${blocked.quote.reason}`);

  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const shippingTotal = groups.reduce((s, g) => s + (g.quote.available ? g.quote.fee : 0), 0);

  // TODO(payments): charge the card here (Stripe Connect) before writing the order.
  const { items: _items, ...customer } = input;
  return db.order.create({
    data: {
      ...customer,
      number: orderNumber(),
      subtotal,
      shippingTotal,
      total: subtotal + shippingTotal,
      paymentStatus: "paid",
      vendorOrders: {
        create: groups.map((g) => {
          if (!g.quote.available) throw new Error("unreachable");
          const commission = Math.round(g.subtotal * g.commissionRate);
          return {
            vendorId: g.vendorId,
            method: g.quote.method,
            shipDate: new Date(`${g.quote.shipDate}T00:00:00Z`),
            deliveryDate: new Date(`${g.quote.deliveryDate}T00:00:00Z`),
            subtotal: g.subtotal,
            shippingFee: g.quote.fee,
            commission,
            // Vendor keeps the shipping fee to cover packaging and carrier costs.
            vendorPayout: g.subtotal - commission + g.quote.fee,
            items: { create: g.lines },
          };
        }),
      },
    },
  });
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
