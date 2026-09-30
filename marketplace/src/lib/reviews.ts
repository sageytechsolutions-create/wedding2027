import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { localNow } from "./time";

// How long after delivery a customer can still leave a review.
export const REVIEW_WINDOW_DAYS = 120;

export const reviewInputSchema = z.object({
  number: z.string().min(1),
  email: z.string().email(),
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick 1 to 5 stars.").max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Tell others a little more (at least 10 characters).").max(2000),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

// "Dana Levi" -> "Dana L."; the full name and email are never shown.
export function publicName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "Customer";
}

// A shipment can be reviewed once it's delivered (or its delivery date has passed while
// it was on its way), and for REVIEW_WINDOW_DAYS after that.
export function canReview(vo: { status: string; deliveryDate: Date }, now = new Date()): boolean {
  const today = localNow(now).day;
  const arrived = vo.status === "delivered" || (["shipped", "out_for_delivery"].includes(vo.status) && vo.deliveryDate <= today);
  const withinWindow = today.getTime() - vo.deliveryDate.getTime() <= REVIEW_WINDOW_DAYS * 86_400_000;
  return arrived && withinWindow;
}

export async function submitReview(input: ReviewInput, now = new Date()): Promise<{ error?: string }> {
  const item = await db.orderItem.findUnique({
    where: { id: input.orderItemId },
    include: { vendorOrder: { include: { order: true } }, review: { select: { id: true } } },
  });
  const order = item?.vendorOrder.order;
  // The order number + email pair is what proves this is the customer (same as viewing the order).
  if (!item || !order || order.number !== input.number || order.email.toLowerCase() !== input.email.trim().toLowerCase()) {
    return { error: "We couldn't find that item in your order." };
  }
  if (order.paymentStatus !== "paid" || item.vendorOrder.status === "cancelled") return { error: "This item can't be reviewed." };
  if (!canReview(item.vendorOrder, now)) return { error: "You can review this once it's been delivered." };
  if (item.review) return { error: "You've already reviewed this item. Thank you!" };

  try {
    await db.$transaction([
      db.review.create({
        data: {
          orderItemId: item.id,
          productId: item.productId,
          vendorId: item.vendorOrder.vendorId,
          rating: input.rating,
          title: input.title || null,
          body: input.body,
          authorName: publicName(order.name),
        },
      }),
      db.product.update({ where: { id: item.productId }, data: { ratingCount: { increment: 1 }, ratingSum: { increment: input.rating } } }),
    ]);
  } catch (e) {
    // Two submissions at once: the unique orderItemId lets only one through.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "You've already reviewed this item. Thank you!" };
    throw e;
  }
  return {};
}

// Admins hide abusive or off-topic reviews (and can bring them back). Totals follow.
export async function setReviewHidden(reviewId: string, hidden: boolean, actor: CurrentUser) {
  if (actor.role !== "admin") throw new Error("Only admins can moderate reviews.");
  await db.$transaction(async (tx) => {
    const review = await tx.review.findUniqueOrThrow({ where: { id: reviewId } });
    const { count } = await tx.review.updateMany({ where: { id: reviewId, hidden: !hidden }, data: { hidden } });
    if (count === 0) return; // already in that state
    const sign = hidden ? -1 : 1;
    await tx.product.update({
      where: { id: review.productId },
      data: { ratingCount: { increment: sign }, ratingSum: { increment: sign * review.rating } },
    });
  });
}

// The vendor (or an admin) posts one public reply; an empty reply removes it.
export async function replyToReview(reviewId: string, reply: string, actor: CurrentUser): Promise<{ error?: string }> {
  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { error: "Review not found." };
  if (actor.role !== "admin" && actor.vendorId !== review.vendorId) return { error: "You can only reply to reviews of your own products." };
  const text = reply.trim();
  if (text.length > 1000) return { error: "Please keep replies under 1000 characters." };
  await db.review.update({
    where: { id: reviewId },
    data: text ? { vendorReply: text, vendorReplyAt: new Date() } : { vendorReply: null, vendorReplyAt: null },
  });
  return {};
}

export function averageRating(p: { ratingCount: number; ratingSum: number }): number | null {
  return p.ratingCount > 0 ? p.ratingSum / p.ratingCount : null;
}
