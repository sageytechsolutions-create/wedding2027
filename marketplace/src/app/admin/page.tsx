import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { RefundPriorityButton } from "@/components/RefundPriorityButton";
import { UserAdmin } from "@/components/UserAdmin";
import { createVendor, toggleCourierPickup, toggleVendor } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDeliveryDate } from "@/lib/format";
import { localNow } from "@/lib/time";
import { db } from "@/lib/db";
import { formatMoney, vendorLocation } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const field = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const today = localNow(new Date()).day;
  const [vendors, recent, totals, users, refunds, unreversed, latePriority, priorityRefunded] = await Promise.all([
    db.vendor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
        vendorOrders: { where: { status: { not: "cancelled" }, order: { paymentStatus: "paid" } }, select: { subtotal: true, commission: true } },
      },
    }),
    db.vendorOrder.findMany({ where: { order: { paymentStatus: "paid" } }, orderBy: { order: { createdAt: "desc" } }, take: 15, include: { order: true, vendor: true } }),
    db.vendorOrder.aggregate({
      where: { status: { not: "cancelled" }, order: { paymentStatus: "paid" } },
      _sum: { subtotal: true, shippingFee: true, commission: true, vendorPayout: true },
      _count: true,
    }),
    db.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }], include: { vendor: { select: { name: true } } } }),
    db.vendorOrder.aggregate({ where: { status: "cancelled" }, _sum: { refundAmount: true }, _count: true }),
    // Customer refunded, but the vendor had already been paid and pulling it back failed.
    db.vendorOrder.findMany({
      where: { status: "cancelled", stripeTransferId: { not: null }, stripeTransferReversalId: null, stripeRefundId: { not: null } },
      include: { order: true, vendor: true },
    }),
    // Priority orders past their guaranteed date and not marked delivered: likely owed a priority-fee refund.
    db.vendorOrder.findMany({
      where: {
        priority: true,
        priorityRefundedAt: null,
        deliveryDate: { lt: today },
        status: { notIn: ["delivered", "cancelled"] },
        order: { paymentStatus: "paid" },
      },
      orderBy: { deliveryDate: "asc" },
      include: { order: true, vendor: true },
    }),
    // Shown for a week as confirmation, and as a record of the guarantee being honored.
    db.vendorOrder.findMany({
      where: { priorityRefundedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: { priorityRefundedAt: "desc" },
      include: { order: true, vendor: true },
    }),
  ]);

  const stats = [
    ["Gross merchandise sales", formatMoney(totals._sum.subtotal ?? 0)],
    // Commission plus local courier fees (everything customers paid that isn't owed to vendors).
    ["Platform revenue", formatMoney((totals._sum.subtotal ?? 0) + (totals._sum.shippingFee ?? 0) - (totals._sum.vendorPayout ?? 0))],
    ["Owed to vendors", formatMoney(totals._sum.vendorPayout ?? 0)],
    ["Vendor shipments", String(totals._count)],
    [`Refunded (${refunds._count} cancelled)`, formatMoney(refunds._sum.refundAmount ?? 0)],
  ];

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-3xl font-bold">Marketplace admin</h1>
          <Link href="/admin/emails" className="text-sm font-medium text-brand">Emails →</Link>
        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {(latePriority.length > 0 || priorityRefunded.length > 0) && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-semibold">⚡ Late priority orders</h2>
          {latePriority.length > 0 ? (
            <p className="mt-1">
              These were guaranteed to arrive before Yom Tov and aren&apos;t marked delivered. If they were late, refund the priority fee (our
              promise). If they did arrive on time, have the vendor mark them delivered.
            </p>
          ) : (
            <p className="mt-1">None waiting. 👍</p>
          )}
          <ul className="mt-3 space-y-2">
            {latePriority.map((vo) => (
              <li key={vo.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong>{vo.order.number}</strong> · {vo.vendor.name} · due {formatDeliveryDate(vo.deliveryDate)} · {vo.status.replace(/_/g, " ")}
                </span>
                <RefundPriorityButton vendorOrderId={vo.id} amount={vo.priorityFee} />
              </li>
            ))}
            {priorityRefunded.map((vo) => (
              <li key={vo.id} className="text-emerald-800">
                ✓ <strong>{vo.order.number}</strong> · {vo.vendor.name} · {formatMoney(vo.priorityFee)} priority fee refunded{" "}
                {vo.priorityRefundedAt!.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {unreversed.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <h2 className="font-semibold">Vendor payouts to pull back in Stripe</h2>
          <p className="mt-1">These customers were refunded, but the vendor had already been paid and the automatic reversal failed. Reverse the transfer in the Stripe dashboard.</p>
          <ul className="mt-2 list-disc pl-5">
            {unreversed.map((vo) => (
              <li key={vo.id}>
                {vo.order.number} · {vo.vendor.name} · {formatMoney(vo.vendorPayout)} · transfer {vo.stripeTransferId}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Vendors ({vendors.length})</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Hechsher</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Payouts</th>
                <th className="px-4 py-3">NYC courier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {vendors.map((v) => (
                <tr key={v.id} className={v.active ? "" : "text-stone-400"}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/vendor/${v.slug}`} className="hover:text-brand">{v.emoji} {v.name}</Link>
                  </td>
                  <td className="px-4 py-3">{vendorLocation(v) || <span className="text-amber-700">Missing</span>}</td>
                  <td className="px-4 py-3">{v.certification || <span className="text-amber-700">Missing</span>}</td>
                  <td className="px-4 py-3">{v._count.products}</td>
                  <td className="px-4 py-3">{formatMoney(v.vendorOrders.reduce((s, o) => s + o.subtotal, 0))}</td>
                  <td className="px-4 py-3">{Math.round(v.commissionRate * 100)}%</td>
                  <td className="px-4 py-3">{v.stripePayoutsEnabled ? "✓ Stripe" : v.stripeAccountId ? "Setup started" : "Not connected"}</td>
                  <td className="px-4 py-3">
                    <form action={toggleCourierPickup}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="text-brand">{v.courierPickup ? "✓ Picks up" : "Off"}</button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleVendor}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="text-brand">{v.active ? "Deactivate" : "Activate"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
          <summary className="cursor-pointer font-medium">+ Onboard a new vendor</summary>
          <form action={createVendor} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Business name" className={field} />
            <input name="tagline" required placeholder="Tagline" className={field} />
            <input name="city" required placeholder="City" className={field} />
            <div className="grid grid-cols-2 gap-3">
              <input name="state" required maxLength={2} placeholder="State (NY)" className={field} />
              <input name="originZip" required pattern="\d{5}" placeholder="Kitchen ZIP" className={field} />
            </div>
            <input name="certification" required placeholder="Hechsher (OU, OK, Star-K…)" className={field} />
            <input name="emoji" placeholder="Emoji" className={field} />
            <input name="commissionPercent" type="number" min="0" max="60" defaultValue="20" placeholder="Commission %" className={field} />
            <textarea name="story" placeholder="Their story" rows={3} className={`${field} sm:col-span-2`} />
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white sm:justify-self-start">Create vendor</button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Logins</h2>
        <p className="mt-1 text-sm text-stone-500">Vendor logins only see their own shop. Admins see everything.</p>
        <UserAdmin
          users={users.map((u) => ({ id: u.id, email: u.email, role: u.role, vendorName: u.vendor?.name ?? null, isYou: u.id === admin.id }))}
          vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold">Recent orders</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-stone-500">No orders yet. Place one from the storefront to see it here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white text-sm">
            {recent.map((vo) => (
              <li key={vo.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="font-medium">{vo.order.number}</span>
                <span className="text-stone-500">{vo.vendor.name}</span>
                <StatusBadge status={vo.status} />
                <span className="ml-auto">{formatMoney(vo.subtotal + vo.shippingFee)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
