import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor portal" };

export default async function VendorPortalIndex() {
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold">Vendor portal</h1>
      <div className="mt-3 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
        Demo: pick a vendor to sign in as. Real vendor logins come next.
      </div>
      <ul className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {vendors.map((v) => (
          <li key={v.id}>
            <Link href={`/vendor/${v.slug}`} className="flex items-center gap-3 px-5 py-4 hover:bg-stone-50">
              <span className="text-2xl">{v.emoji}</span>
              <span className="flex-1 font-medium">{v.name}</span>
              <span className="text-sm text-stone-500">{v.city}, {v.state}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
