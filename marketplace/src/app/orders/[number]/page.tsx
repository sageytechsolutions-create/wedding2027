import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/ClearCart";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import { canReview } from "@/lib/reviews";
import { StatusBadge } from "@/components/StatusBadge";
import { db } from "@/lib/db";
import { formatDeliveryDate, methodLabel } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { number } = await params;
  const { email = "" } = await searchParams;
  const order = await db.order.findUnique({
    where: { number },
    include: { vendorOrders: { include: { vendor: true, items: { include: { review: true } } } } },
  });
  // Require the order email so order numbers alone can't be used to look up addresses.
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      {order.paymentStatus === "paid" ? (
        <div className="rounded-3xl bg-emerald-50 p-8 text-center">
          <ClearCart />
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 font-display text-3xl font-bold">Thanks, {order.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-stone-600">
            Order <strong>{order.number}</strong> is confirmed. Bookmark this page to check on your delivery.
          </p>
        </div>
      ) : order.paymentStatus === "pending" ? (
        <div className="rounded-3xl bg-amber-50 p-8 text-center">
          <div className="text-5xl">⏳</div>
          <h1 className="mt-3 font-display text-3xl font-bold">Confirming your payment…</h1>
          <p className="mt-2 text-stone-600">This usually takes a few seconds. Refresh this page in a moment.</p>
        </div>
      ) : (
        <div className="rounded-3xl bg-red-50 p-8 text-center">
          <h1 className="font-display text-3xl font-bold">This order wasn&apos;t paid</h1>
          <p className="mt-2 text-stone-600">
            The payment was not completed, so nothing will ship. <Link href="/cart" className="text-brand">Return to your cart</Link>.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-5">
        {order.vendorOrders.map((vo) => (
          <section key={vo.id} className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{vo.vendor.emoji} {vo.vendor.name}</h2>
              <span className="flex gap-2">
                {vo.priority && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">⚡ Priority before {vo.holidayName}</span>
                )}
                <StatusBadge status={vo.status} />
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {vo.status === "cancelled" ? (
                <span className="text-red-700">
                  Cancelled by the shop{vo.cancelReason && <> (&ldquo;{vo.cancelReason}&rdquo;)</>}. Refunded <strong>{formatMoney(vo.refundAmount ?? 0)}</strong>
                  {order.stripePaymentIntentId && " to your card"}.
                </span>
              ) : (
                <>
                  {methodLabel(vo.method)}. Arrives <strong>{formatDeliveryDate(vo.deliveryDate)}</strong>
                  {vo.priorityRefundedAt && (
                    <span className="block text-emerald-700">Sorry it was late: your {formatMoney(vo.priorityFee)} priority fee was refunded.</span>
                  )}
                </>
              )}
            </p>
            {vo.trackingNumber && (
              <p className="mt-1 text-sm text-stone-600">Tracking: {vo.carrier} {vo.trackingNumber}</p>
            )}
            <ul className="mt-4 space-y-1 text-sm">
              {vo.items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.quantity} × {i.name}</span>
                  <span>{formatMoney(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between text-stone-500">
                <span>{vo.priority ? "Priority delivery" : "Shipping"}</span>
                <span>{vo.shippingFee === 0 ? "Free" : formatMoney(vo.shippingFee)}</span>
              </li>
            </ul>
          </section>
        ))}
      </div>

      {order.paymentStatus === "paid" && order.vendorOrders.some((vo) => canReview(vo)) && (
        <section id="reviews" className="mt-6 space-y-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
          <h2 className="font-display text-xl font-bold">How was everything?</h2>
          {order.vendorOrders
            .filter((vo) => canReview(vo))
            .flatMap((vo) => vo.items.map((item) => ({ vo, item })))
            .map(({ vo, item }) => (
              <div key={item.id} className="border-t border-amber-200 pt-4 first:border-0 first:pt-0">
                <p className="text-xs uppercase tracking-wide text-stone-500">{vo.vendor.name}</p>
                {item.review ? (
                  <p className="text-sm">
                    <span className="font-medium">{item.name}</span>: you rated it <Stars rating={item.review.rating} />. Thank you!
                  </p>
                ) : (
                  <ReviewForm number={order.number} email={order.email} orderItemId={item.id} itemName={item.name} />
                )}
              </div>
            ))}
        </section>
      )}

      <div className="mt-6 grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
        <div className="text-sm">
          <h3 className="font-semibold">Shipping to</h3>
          <p className="mt-1 text-stone-600">
            {order.name}<br />
            {order.address1}{order.address2 && <>, {order.address2}</>}<br />
            {order.city}, {order.state} {order.zip}
          </p>
          {order.giftMessage && <p className="mt-3 italic text-stone-600">&ldquo;{order.giftMessage}&rdquo;</p>}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(order.shippingTotal)}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold"><span>Total</span><span>{formatMoney(order.total)}</span></div>
          {order.refundedAmount > 0 && (
            <>
              <div className="flex justify-between text-red-700"><span>Refunded</span><span>−{formatMoney(order.refundedAmount)}</span></div>
              <div className="flex justify-between font-semibold"><span>You paid</span><span>{formatMoney(order.total - order.refundedAmount)}</span></div>
            </>
          )}
        </div>
      </div>

      <p className="mt-8 text-center">
        <Link href="/shop" className="text-brand">Keep shopping →</Link>
      </p>
    </div>
  );
}
