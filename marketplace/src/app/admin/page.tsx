import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { createVendor, toggleVendor } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const field = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

export default async function AdminPage() {
  const [vendors, recent, totals] = await Promise.all([
    db.vendor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
        vendorOrders: { where: { status: { not: "cancelled" } }, select: { subtotal: true, commission: true } },
      },
    }),
    db.vendorOrder.findMany({ orderBy: { order: { createdAt: "desc" } }, take: 15, include: { order: true, vendor: true } }),
    db.vendorOrder.aggregate({
      where: { status: { not: "cancelled" } },
      _sum: { subtotal: true, shippingFee: true, commission: true, vendorPayout: true },
      _count: true,
    }),
  ]);

  const stats = [
    ["Gross merchandise sales", formatMoney(totals._sum.subtotal ?? 0)],
    ["Platform revenue (commission)", formatMoney(totals._sum.commission ?? 0)],
    ["Owed to vendors", formatMoney(totals._sum.vendorPayout ?? 0)],
    ["Vendor shipments", String(totals._count)],
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Marketplace admin</h1>
        <p className="mt-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          Demo: this page is open to anyone. Admin login comes before launch.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold">Vendors ({vendors.length})</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {vendors.map((v) => (
                <tr key={v.id} className={v.active ? "" : "text-stone-400"}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/vendor/${v.slug}`} className="hover:text-brand">{v.emoji} {v.name}</Link>
                  </td>
                  <td className="px-4 py-3">{v.city}, {v.state}</td>
                  <td className="px-4 py-3">{v._count.products}</td>
                  <td className="px-4 py-3">{formatMoney(v.vendorOrders.reduce((s, o) => s + o.subtotal, 0))}</td>
                  <td className="px-4 py-3">{Math.round(v.commissionRate * 100)}%</td>
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
            <input name="emoji" placeholder="Emoji" className={field} />
            <input name="commissionPercent" type="number" min="0" max="60" defaultValue="20" placeholder="Commission %" className={field} />
            <textarea name="story" placeholder="Their story" rows={3} className={`${field} sm:col-span-2`} />
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white sm:justify-self-start">Create vendor</button>
          </form>
        </details>
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
