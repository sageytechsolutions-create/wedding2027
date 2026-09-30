import Link from "next/link";
import { ProductImage } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { db } from "@/lib/db";
import { vendorLocation } from "@/lib/money";
import { mainPhoto, productPhotoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shops" };

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: {
      products: { where: { active: true }, orderBy: [{ featured: "desc" }, { ratingCount: "desc" }], include: mainPhoto },
    },
  });

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">Home</Link> <span aria-hidden>/</span> <span className="text-stone-900">Shops</span>
      </nav>
      <div className="mt-3 border-b border-stone-200 pb-5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Our shops</h1>
        <p className="mt-1 text-stone-600">Local legends from across the country, every one certified kosher.</p>
      </div>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => {
          const hero = v.products[0];
          const count = v.products.reduce((n, p) => n + p.ratingCount, 0);
          const sum = v.products.reduce((n, p) => n + p.ratingSum, 0);
          return (
            <Link key={v.id} href={`/vendors/${v.slug}`} className="group block">
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
                  <ProductImage emoji={hero?.emoji ?? v.emoji} imageUrl={hero ? productPhotoUrl(hero) : null} accent={v.accentColor} className="transition duration-300 group-hover:scale-105" />
                </div>
                <span className="absolute bottom-0 left-4 flex h-14 w-14 translate-y-1/3 items-center justify-center rounded-full border-4 border-white bg-white text-2xl shadow" aria-hidden>{v.emoji}</span>
              </div>
              <div className="px-0.5 pt-6">
                <h2 className="text-lg font-bold group-hover:text-brand">{v.name}</h2>
                <p className="text-sm text-stone-500">
                  {[vendorLocation(v), v.certification && `Certified ${v.certification}`, `${v.products.length} item${v.products.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                </p>
                {count > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-600">
                    <Stars rating={sum / count} /> {(sum / count).toFixed(1)} ({count})
                  </p>
                )}
                <p className="mt-1.5 line-clamp-2 text-sm text-stone-700">{v.tagline}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
