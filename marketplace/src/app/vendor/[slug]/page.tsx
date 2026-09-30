import { site } from "@/lib/config";
import { notFound } from "next/navigation";
import { CancelOrderForm } from "@/components/CancelOrderForm";
import { ProductPhotos } from "@/components/ProductPhotos";
import { RefundPriorityButton } from "@/components/RefundPriorityButton";
import { StatusBadge } from "@/components/StatusBadge";
import { connectStripe, createProduct, toggleProduct, updateVendorOrder, updateVendorSettings } from "@/lib/actions";
import { requireVendorAccess } from "@/lib/auth";
import { refreshStripeStatus } from "@/lib/payouts";
import { VENDOR_CANCELLABLE } from "@/lib/refunds";
import { db } from "@/lib/db";
import { formatDeliveryDate, methodLabel } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import { KOSHER_LABELS, KOSHER_TYPES, kosherLabels } from "@/lib/kosher";
import { stripe } from "@/lib/stripe";
import { VENDOR_ORDER_STATUSES, statusLabel } from "@/lib/orders";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

export default async function VendorDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await db.vendor.findUnique({ where: { slug }, select: { id: true, stripeAccountId: true, stripePayoutsEnabled: true } });
  if (!found) notFound();
  const user = await requireVendorAccess(found.id, `/vendor/${slug}`);
  // Coming back from Stripe onboarding: pick up the new status and pay out anything owed.
  if (found.stripeAccountId && !found.stripePayoutsEnabled) await refreshStripeStatus(found.id);

  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: {
      products: { orderBy: { createdAt: "desc" }, include: { images: { orderBy: { position: "asc" }, select: { id: true } } } },
      vendorOrders: {
        // Unpaid checkouts never reach the vendor.
        where: { order: { paymentStatus: "paid" } },
        orderBy: [{ shipDate: "asc" }, { priority: "desc" }],
        include: { order: true, items: true },
      },
    },
  });
  if (!vendor) notFound();

  const open = vendor.vendorOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const done = vendor.vendorOrders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const paid = vendor.vendorOrders.filter((o) => o.status !== "cancelled");
  const payout = paid.reduce((s, o) => s + o.vendorPayout, 0);
  const sales = paid.reduce((s, o) => s + o.subtotal, 0);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Vendor portal</p>
        <h1 className="font-display text-3xl font-bold">{vendor.emoji} {vendor.name}</h1>
        {vendor.certification && <p className="text-sm text-stone-500">Hechsher: {vendor.certification}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Open orders", String(open.length)],
          ["Gross sales", formatMoney(sales)],
          ["Your payout", formatMoney(payout)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold">Orders to fulfill</h2>
        {open.length === 0 && <p className="mt-3 text-stone-500">No open orders right now.</p>}
        <div className="mt-4 space-y-4">
          {[...open, ...done].map((vo) => (
            <div key={vo.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{vo.order.number}</span>{" "}
                  <StatusBadge status={vo.status} />
                  {vo.priority && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">⚡ Priority before {vo.holidayName}</span>
                  )}
                  {vo.priorityRefundedAt && (
                    <span className="ml-2 text-xs text-stone-500">Late: {formatMoney(vo.priorityFee)} priority fee refunded</span>
                  )}
                </div>
                <span className="text-sm text-stone-600">
                  {methodLabel(vo.method)} · {vo.method === "local_delivery" ? "courier pickup" : "ship by"}{" "}
                  <strong>{formatDeliveryDate(vo.shipDate)}</strong>
                </span>
              </div>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                <ul>
                  {vo.items.map((i) => <li key={i.id}>{i.quantity} × {i.name}</li>)}
                </ul>
                <p className="text-stone-600">
                  {vo.order.name}<br />
                  {vo.order.address1}{vo.order.address2 && `, ${vo.order.address2}`}<br />
                  {vo.order.city}, {vo.order.state} {vo.order.zip}
                  {vo.order.giftMessage && <><br /><em>Gift note: &ldquo;{vo.order.giftMessage}&rdquo;</em></>}
                </p>
              </div>
              {vo.status === "cancelled" ? (
                <p className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
                  Cancelled{vo.cancelledAt && ` ${vo.cancelledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} · customer refunded{" "}
                  <strong>{formatMoney(vo.refundAmount ?? 0)}</strong>
                  {vo.cancelReason && <> · &ldquo;{vo.cancelReason}&rdquo;</>}
                </p>
              ) : (
              <>
              <form action={updateVendorOrder} className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                <input type="hidden" name="id" value={vo.id} />
                <select name="status" defaultValue={vo.status} className={field}>
                  {VENDOR_ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                {vo.method !== "local_delivery" && (
                  <>
                    <input name="carrier" defaultValue={vo.carrier ?? ""} placeholder="Carrier (UPS, FedEx)" className={field} />
                    <input name="trackingNumber" defaultValue={vo.trackingNumber ?? ""} placeholder="Tracking #" className={field} />
                  </>
                )}
                <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">Update</button>
                <span className="ml-auto text-sm text-stone-500">Payout {formatMoney(vo.vendorPayout)}</span>
                <p className="w-full text-xs text-stone-500">
                  {vo.method === "local_delivery"
                    ? "Marking it “Out for delivery” emails the customer."
                    : "Enter the carrier and tracking number, then mark it “Shipped”. The customer gets one email with the tracking link."}
                </p>
              </form>
              {/* Vendors can cancel until it's on its way; admins at any time (e.g. lost in transit). */}
              {(user.role === "admin" || VENDOR_CANCELLABLE.includes(vo.status)) && (
                <div className="mt-3 flex flex-wrap items-start gap-4">
                  {user.role === "admin" && vo.priority && vo.priorityFee > 0 && !vo.priorityRefundedAt && (
                    <RefundPriorityButton vendorOrderId={vo.id} amount={vo.priorityFee} />
                  )}
                  <CancelOrderForm
                    vendorOrderId={vo.id}
                    amount={vo.subtotal + vo.shippingFee}
                    onTheWay={!VENDOR_CANCELLABLE.includes(vo.status)}
                  />
                </div>
              )}
              </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Products</h2>
        <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {vendor.products.map((p) => (
            <li key={p.id} className="space-y-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <span className={`flex-1 ${p.active ? "" : "text-stone-400 line-through"}`}>{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${kosherLabels[p.kosherType]?.className ?? ""}`}>{kosherLabels[p.kosherType]?.label ?? p.kosherType}</span>
                <span className="text-sm">{formatMoney(p.price)}</span>
                <form action={toggleProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-sm text-brand">{p.active ? "Hide" : "Show"}</button>
                </form>
              </div>
              <ProductPhotos productId={p.id} productName={p.name} photos={p.images} />
              {p.images.length === 0 && <p className="text-xs text-amber-700">No photos yet. Products with photos sell much better.</p>}
            </li>
          ))}
        </ul>

        <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
          <summary className="cursor-pointer font-medium">+ Add a product</summary>
          <form action={createProduct} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="vendorId" value={vendor.id} />
            <input name="name" required placeholder="Product name" className={field} />
            <input name="price" required type="number" step="0.01" min="0" placeholder="Price ($)" className={field} />
            <input name="category" required placeholder="Category (e.g. BBQ, Desserts)" className={field} />
            <input name="serves" placeholder="Serves (e.g. 4–6)" className={field} />
            <select name="kosherType" required defaultValue="" className={field}>
              <option value="" disabled>Meat / Dairy / Pareve</option>
              {KOSHER_TYPES.map((k) => <option key={k} value={k}>{kosherLabels[k].label}</option>)}
            </select>
            <input name="emoji" placeholder="Emoji (shown until you add photos)" className={field} />
            <textarea name="description" required placeholder="Description" rows={3} className={`${field} sm:col-span-2`} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="perishable" defaultChecked /> Perishable (ships Mon–Thu only)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="kosherForPassover" /> Kosher for Passover
            </label>
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm sm:col-span-2">
              <legend className="mb-1 text-stone-500">Hashgacha standards</legend>
              {Object.entries(KOSHER_LABELS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" name="labels" value={k} /> {v}
                </label>
              ))}
            </fieldset>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white sm:justify-self-end">Add product</button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Getting paid</h2>
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
          {!stripe ? (
            <p className="text-stone-500">Stripe isn&apos;t configured on this site yet (demo mode).</p>
          ) : vendor.stripePayoutsEnabled ? (
            <p className="text-emerald-700">✓ Payouts are on. Your share of each order is sent to your bank through Stripe as soon as the customer pays.</p>
          ) : (
            <form action={connectStripe} className="flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="id" value={vendor.id} />
              <p className="text-stone-600">
                {vendor.stripeAccountId ? "Finish setting up Stripe to receive payouts." : "Connect a bank account through Stripe to receive payouts."}
                {" "}Payouts for orders you&apos;ve already received are sent once you finish.
              </p>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
                {vendor.stripeAccountId ? "Continue Stripe setup" : "Connect with Stripe"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Delivery & shipping</h2>
        <form action={updateVendorSettings} className="mt-4 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={vendor.id} />
          <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600 sm:col-span-2">
            {vendor.courierPickup
              ? `🚚 The ${site.name} courier picks up your local NYC orders and delivers them next day. Just have them packed by pickup.`
              : "Local courier pickup isn't set up for your location, so all orders ship."}
          </p>
          <label className="text-sm">
            Overnight shipping fee ($)
            <input name="overnightShipFee" type="number" step="0.01" min="0" defaultValue={(vendor.overnightShipFee / 100).toFixed(2)} className={`${field} mt-1 w-full`} />
          </label>
          <label className="text-sm">
            2-day shipping fee ($, blank = don&apos;t offer; shelf-stable orders only)
            <input name="twoDayShipFee" type="number" step="0.01" min="0" defaultValue={vendor.twoDayShipFee != null ? (vendor.twoDayShipFee / 100).toFixed(2) : ""} className={`${field} mt-1 w-full`} />
          </label>
          <label className="text-sm">
            Priority before Yom Tov, overnight ($)
            <input name="priorityOvernightFee" type="number" step="0.01" min="0" defaultValue={(vendor.priorityOvernightFee / 100).toFixed(2)} className={`${field} mt-1 w-full`} />
          </label>
          <label className="text-sm">
            Priority before Yom Tov, 2-day ($)
            <input name="priorityTwoDayFee" type="number" step="0.01" min="0" defaultValue={(vendor.priorityTwoDayFee / 100).toFixed(2)} className={`${field} mt-1 w-full`} />
          </label>
          <label className="text-sm">
            Free shipping on orders over ($, blank = never)
            <input name="freeShippingMin" type="number" step="0.01" min="0" defaultValue={vendor.freeShippingMin != null ? (vendor.freeShippingMin / 100).toFixed(2) : ""} className={`${field} mt-1 w-full`} />
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="shipsNationwide" defaultChecked={vendor.shipsNationwide} /> Ship nationwide
          </label>
          <p className="text-sm text-stone-500 sm:col-span-2">Platform commission: {Math.round(vendor.commissionRate * 100)}% of item sales. You keep shipping and priority fees for orders you ship; local courier fees go to {site.name}.</p>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white sm:col-span-2 sm:justify-self-start">Save settings</button>
        </form>
      </section>
    </div>
  );
}
