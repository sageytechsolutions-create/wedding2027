import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Our vendors</h1>
      <p className="mt-2 text-stone-600">Family-run kitchens and bakeries from across the country.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <Link key={v.id} href={`/vendors/${v.slug}`} className="rounded-2xl border border-stone-200 bg-white p-6 hover:shadow-md">
            <span className="flex h-16 w-16 items-center justify-center rounded-full text-4xl" style={{ background: `${v.accentColor}22` }}>{v.emoji}</span>
            <h2 className="mt-4 text-lg font-semibold">{v.name}</h2>
            <p className="text-sm text-stone-500">{v.city}, {v.state} · {v._count.products} items</p>
            <p className="mt-2 text-sm text-stone-700">{v.tagline}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
