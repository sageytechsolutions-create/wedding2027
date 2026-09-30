import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { vendorLocation } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor portal" };

export default async function VendorPortalIndex() {
  const user = await requireUser("/vendor");
  // Vendor staff go straight to their own dashboard.
  if (user.role !== "admin") redirect(user.vendorSlug ? `/vendor/${user.vendorSlug}` : "/login?error=forbidden");

  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold">Vendor portals</h1>
      <p className="mt-2 text-sm text-stone-500">As an admin you can open any vendor&apos;s portal.</p>
      <ul className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {vendors.map((v) => (
          <li key={v.id}>
            <Link href={`/vendor/${v.slug}`} className="flex items-center gap-3 px-5 py-4 hover:bg-stone-50">
              <span className="text-2xl">{v.emoji}</span>
              <span className="flex-1 font-medium">{v.name}</span>
              <span className="text-sm text-stone-500">{vendorLocation(v)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
