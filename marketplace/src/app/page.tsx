import { vendorLocation } from "@/lib/money";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";

const productCardInclude = { vendor: { select: { name: true, city: true, state: true, accentColor: true } } } as const;

export default async function HomePage() {
  const [featured, vendors, categories] = await Promise.all([
    db.product.findMany({ where: { featured: true, active: true, vendor: { active: true } }, include: productCardInclude, take: 8 }),
    db.vendor.findMany({ where: { featured: true, active: true }, take: 6 }),
    db.product.findMany({ where: { active: true }, distinct: ["category"], select: { category: true, emoji: true } }),
  ]);

  return (
    <div className="space-y-14">
      <section className="rounded-3xl bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 px-6 py-14 text-center sm:px-12">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{site.tagline}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
          Certified kosher delis, bakeries and grills from across the country. Next-day delivery if you&apos;re local, overnight shipping everywhere else. Never on Shabbat.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">Shop all food</Link>
          <Link href="/vendors" className="rounded-full border border-stone-300 bg-white px-6 py-3 font-medium hover:border-brand">Meet the vendors</Link>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Shop by category</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {categories.map((c) => (
            <Link key={c.category} href={`/shop?category=${encodeURIComponent(c.category)}`} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand">
              {c.emoji} {c.category}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Fan favorites</h2>
          <Link href="/shop" className="text-sm font-medium text-brand">See all →</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Our kosher kitchens</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <Link key={v.id} href={`/vendors/${v.slug}`} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-md">
              <span className="flex h-14 w-14 items-center justify-center rounded-full text-3xl" style={{ background: `${v.accentColor}22` }}>{v.emoji}</span>
              <div>
                <h3 className="font-semibold">{v.name}</h3>
                <p className="text-sm text-stone-500">{vendorLocation(v)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl bg-white p-8 sm:grid-cols-3">
        {[
          ["📦", "Shipped overnight", "Packed with ice packs or dry ice and delivered the next business day, anywhere in the US."],
          ["🚚", "Local next-day delivery", "Live near the kitchen? The vendor hand-delivers it tomorrow, Sunday through Friday."],
          ["✡️", "Every item certified", "Each vendor's hechsher is listed, and every product is marked meat, dairy or pareve."],
        ].map(([icon, title, body]) => (
          <div key={title}>
            <div className="text-3xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-stone-600">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
