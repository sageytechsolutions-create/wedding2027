import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard, ProductImage } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { db } from "@/lib/db";
import { mainPhoto, productPhotoUrl } from "@/lib/photos";
import { formatMoney, vendorLocation } from "@/lib/money";
import { localDelivery } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({ where: { slug } });
  if (!vendor) return {};
  return { title: vendor.name, description: vendor.tagline, openGraph: { title: vendor.name, description: vendor.tagline } };
}

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: { products: { where: { active: true }, orderBy: [{ featured: "desc" }, { price: "asc" }], include: mainPhoto } },
  });
  if (!vendor || !vendor.active) notFound();

  const ratingCount = vendor.products.reduce((n, p) => n + p.ratingCount, 0);
  const ratingSum = vendor.products.reduce((n, p) => n + p.ratingSum, 0);
  const cardVendor = { name: vendor.name, city: vendor.city, state: vendor.state, accentColor: vendor.accentColor };

  const hero = vendor.products.find((p) => p.images.length > 0) ?? vendor.products[0];
  const perks = [
    vendor.courierPickup && `🚚 NYC next-day delivery ${formatMoney(localDelivery.fee)}`,
    vendor.shipsNationwide && `📦 Overnight shipping ${formatMoney(vendor.overnightShipFee)}`,
    vendor.shipsNationwide && vendor.twoDayShipFee != null && `📦 2-day shipping ${formatMoney(vendor.twoDayShipFee)} (shelf-stable)`,
    vendor.freeShippingMin != null && `✨ Free shipping over ${formatMoney(vendor.freeShippingMin)}`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">Home</Link> <span aria-hidden>/</span>{" "}
        <Link href="/vendors" className="hover:text-stone-900">Shops</Link> <span aria-hidden>/</span>{" "}
        <span className="text-stone-900">{vendor.name}</span>
      </nav>

      <section className="mt-4 overflow-hidden rounded-3xl border border-stone-200">
        <div className="relative h-48 sm:h-64">
          <ProductImage emoji={hero?.emoji ?? vendor.emoji} imageUrl={hero ? productPhotoUrl(hero, "large") : null} accent={vendor.accentColor} className="text-8xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="relative px-6 pb-8 sm:px-10">
          <span className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white text-5xl shadow-md" aria-hidden>{vendor.emoji}</span>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{vendor.name}</h1>
              <p className="mt-1 text-stone-600">
                {[vendorLocation(vendor), vendor.certification && `Kosher certified by ${vendor.certification}`].filter(Boolean).join(" · ")}
              </p>
              {ratingCount > 0 && (
                <p className="mt-1 flex items-center gap-2 text-sm text-stone-700">
                  <Stars rating={ratingSum / ratingCount} /> {(ratingSum / ratingCount).toFixed(1)} from {ratingCount} review{ratingCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {vendor.certification && (
              <span className="rounded-full border-2 border-stone-900 px-4 py-1.5 text-sm font-bold">✡️ {vendor.certification}</span>
            )}
          </div>
          <p className="mt-5 max-w-3xl text-lg text-stone-800">{vendor.tagline}</p>
          {vendor.story && <p className="mt-2 max-w-3xl text-stone-600">{vendor.story}</p>}
          {perks.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2 text-sm">
              {perks.map((p) => <li key={p} className="rounded-full bg-stone-100 px-3 py-1.5">{p}</li>)}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-12 flex items-end justify-between border-b border-stone-200 pb-4">
        <h2 className="text-2xl font-bold tracking-tight">Shop {vendor.name}</h2>
        <p className="text-stone-500">{vendor.products.length} item{vendor.products.length === 1 ? "" : "s"}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {vendor.products.map((p) => <ProductCard key={p.id} product={{ ...p, vendor: cardVendor }} />)}
      </div>
    </div>
  );
}
