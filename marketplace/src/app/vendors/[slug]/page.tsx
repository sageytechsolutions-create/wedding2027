import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { parseZipPrefixes } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: { products: { where: { active: true }, orderBy: [{ featured: "desc" }, { price: "asc" }] } },
  });
  if (!vendor || !vendor.active) notFound();

  const cardVendor = { name: vendor.name, city: vendor.city, state: vendor.state, accentColor: vendor.accentColor };
  const hasLocal = parseZipPrefixes(vendor.localZipPrefixes).length > 0;

  return (
    <div>
      <section className="rounded-3xl p-8 sm:p-12" style={{ background: `linear-gradient(135deg, ${vendor.accentColor}18, ${vendor.accentColor}40)` }}>
        <div className="text-6xl">{vendor.emoji}</div>
        <h1 className="mt-4 font-display text-4xl font-bold">{vendor.name}</h1>
        <p className="mt-1 text-stone-600">
          {vendor.city}, {vendor.state}
          {vendor.certification && <> · Kosher certified by <strong>{vendor.certification}</strong></>}
        </p>
        <p className="mt-4 max-w-2xl text-lg">{vendor.tagline}</p>
        <p className="mt-3 max-w-2xl text-stone-700">{vendor.story}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {vendor.shipsNationwide && (
            <span className="rounded-full bg-white px-3 py-1">📦 Overnight shipping {formatMoney(vendor.overnightShipFee)}</span>
          )}
          {hasLocal && (
            <span className="rounded-full bg-white px-3 py-1">🚚 Local next-day delivery {formatMoney(vendor.localDeliveryFee)}</span>
          )}
          {vendor.freeShippingMin != null && (
            <span className="rounded-full bg-white px-3 py-1">✨ Free shipping over {formatMoney(vendor.freeShippingMin)}</span>
          )}
        </div>
      </section>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {vendor.products.map((p) => <ProductCard key={p.id} product={{ ...p, vendor: cardVendor }} />)}
      </div>
    </div>
  );
}
