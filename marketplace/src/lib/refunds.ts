import "server-only";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { notifyPriorityRefund, notifyRefund } from "./notifications";
import { stripe } from "./stripe";

// Statuses a vendor may still cancel from. Once it's on its way, only an admin can cancel (e.g. lost in transit).
export const VENDOR_CANCELLABLE = ["pending", "preparing"];

export type CancelResult = { error?: string; warning?: string; refunded?: number };

// Cancels one vendor's part of an order and refunds the customer for it in full
// (that shipment's items plus its delivery fee, less anything already refunded).
// If the vendor was already paid out, their payout is pulled back from their Stripe account.
export async function cancelVendorOrder(vendorOrderId: string, reason: string, actor: CurrentUser): Promise<CancelResult> {
  const vo = await db.vendorOrder.findUnique({ where: { id: vendorOrderId }, include: { order: true } });
  if (!vo) return { error: "Order not found." };
  if (actor.role !== "admin" && actor.vendorId !== vo.vendorId) return { error: "You don't have access to this order." };
  if (vo.status === "cancelled") return { refunded: vo.refundAmount ?? 0 };
  if (actor.role !== "admin" && !VENDOR_CANCELLABLE.includes(vo.status)) {
    return { error: "This order is already on its way. Contact Local Legends if it needs a refund." };
  }
  if (vo.order.paymentStatus !== "paid") return { error: "This order was never paid, so there's nothing to refund." };

  // A priority fee refunded earlier (late delivery) has already gone back to the customer.
  const amount = vo.subtotal + vo.shippingFee - (vo.priorityRefundedAt ? vo.priorityFee : 0);
  const toReverse = vo.vendorPayout - vo.payoutReversed;
  let refundId: string | null = null;
  let reversalId: string | null = null;
  let warning: string | undefined;

  if (stripe && vo.order.stripePaymentIntentId) {
    // Refund first: if this fails, nothing changes and the vendor can try again.
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: vo.order.stripePaymentIntentId,
          amount,
          metadata: { orderNumber: vo.order.number, vendorOrderId: vo.id },
        },
        { idempotencyKey: `refund-${vo.id}` },
      );
      refundId = refund.id;
    } catch (e) {
      console.error("Stripe refund failed", vo.id, e);
      return { error: `The refund didn't go through (${(e as Error).message}). Nothing was changed; please try again.` };
    }

    if (vo.stripeTransferId && toReverse > 0) {
      try {
        const reversal = await stripe.transfers.createReversal(
          vo.stripeTransferId,
          { amount: toReverse, metadata: { vendorOrderId: vo.id } },
          { idempotencyKey: `reversal-${vo.id}` },
        );
        reversalId = reversal.id;
      } catch (e) {
        // The customer is refunded either way; flag the payout for an admin to reverse by hand.
        console.error("Stripe transfer reversal failed", vo.id, e);
        warning = "The customer was refunded, but the vendor's payout couldn't be pulled back automatically. An admin needs to reverse it in Stripe.";
      }
    }
  }

  // Only the request that actually flips the status records the refund, so racing clicks can't double-count.
  const flipped = await db.$transaction(async (tx) => {
    const { count } = await tx.vendorOrder.updateMany({
      where: { id: vo.id, status: { not: "cancelled" } },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: actor.email,
        cancelReason: reason,
        refundAmount: amount,
        stripeRefundId: refundId,
        stripeTransferReversalId: reversalId,
        ...(reversalId && { payoutReversed: { increment: toReverse } }),
      },
    });
    if (count === 1) await tx.order.update({ where: { id: vo.orderId }, data: { refundedAmount: { increment: amount } } });
    return count === 1;
  });

  if (flipped) await notifyRefund(vo.id);
  return { refunded: amount, warning };
}

// Our on-time guarantee: refunds just the priority fee on a priority order that arrived late.
// Admins only. For shipped orders the vendor received that fee, so it comes back out of their
// payout; for courier deliveries the platform kept it, so the platform absorbs it.
export async function refundPriorityFee(vendorOrderId: string, actor: CurrentUser): Promise<CancelResult> {
  if (actor.role !== "admin") return { error: "Only Local Legends admins can refund priority fees." };
  const vo = await db.vendorOrder.findUnique({ where: { id: vendorOrderId }, include: { order: true } });
  if (!vo) return { error: "Order not found." };
  if (!vo.priority || vo.priorityFee <= 0) return { error: "This isn't a priority order." };
  if (vo.status === "cancelled") return { error: "This order was cancelled and fully refunded already." };
  if (vo.priorityRefundedAt) return { refunded: vo.priorityFee };
  if (vo.order.paymentStatus !== "paid") return { error: "This order was never paid." };

  const amount = vo.priorityFee;
  const vendorBears = vo.method !== "local_delivery";
  let refundId: string | null = null;
  let reversed = false;
  let warning: string | undefined;

  if (stripe && vo.order.stripePaymentIntentId) {
    try {
      const refund = await stripe.refunds.create(
        { payment_intent: vo.order.stripePaymentIntentId, amount, metadata: { orderNumber: vo.order.number, vendorOrderId: vo.id, reason: "late_priority" } },
        { idempotencyKey: `priority-refund-${vo.id}` },
      );
      refundId = refund.id;
    } catch (e) {
      console.error("Stripe priority refund failed", vo.id, e);
      return { error: `The refund didn't go through (${(e as Error).message}). Nothing was changed; please try again.` };
    }
    if (vendorBears && vo.stripeTransferId) {
      try {
        await stripe.transfers.createReversal(
          vo.stripeTransferId,
          { amount, metadata: { vendorOrderId: vo.id, reason: "late_priority" } },
          { idempotencyKey: `priority-reversal-${vo.id}` },
        );
        reversed = true;
      } catch (e) {
        console.error("Stripe priority fee reversal failed", vo.id, e);
        warning = "The customer was refunded, but the priority fee couldn't be pulled back from the vendor's payout. Reverse it in Stripe.";
      }
    }
  }

  const flipped = await db.$transaction(async (tx) => {
    const { count } = await tx.vendorOrder.updateMany({
      where: { id: vo.id, priorityRefundedAt: null, status: { not: "cancelled" } },
      data: {
        priorityRefundedAt: new Date(),
        stripePriorityRefundId: refundId,
        ...(vendorBears && reversed && { payoutReversed: { increment: amount } }),
        // Not paid out yet: just pay the vendor less.
        ...(vendorBears && !vo.stripeTransferId && { vendorPayout: { decrement: amount } }),
      },
    });
    if (count === 1) await tx.order.update({ where: { id: vo.orderId }, data: { refundedAmount: { increment: amount } } });
    return count === 1;
  });

  if (flipped) await notifyPriorityRefund(vo.id);
  return { refunded: amount, warning };
}
