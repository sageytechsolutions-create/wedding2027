import Link from "next/link";
import { Carousel, CarouselItem } from "@/components/Carousel";
import { ProductCard, ProductImage } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { localDelivery, site } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDeliveryDate } from "@/lib/format";
import { upcomingHoliday } from "@/lib/jewish-calendar";
import { formatMoney, vendorLocation } from "@/lib/money";
import { mainPhoto, productPhotoUrl } from "@/lib/photos";
import { localNow } from "@/lib/time";

export const dynamic = "force-dynamic";

const productCardInclude = { vendor: { select: { name: true, city: true, state: true, accentColor: true } }, ...mainPhoto } as const;

// Most-ordered products over the last 90 days, topped up with featured ones while the shop is new.
async function bestsellers(limit: number) {
  const sales = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      vendorOrder: { status: { not: "cancelled" }, order: { paymentStatus: "paid", createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } } },
      product: { active: true, vendor: { active: true } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  const ids = sales.map((s) => s.productId);
  const [sold, featured] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids } }, include: productCardInclude }),
    db.product.findMany({
      where: { featured: true, active: true, vendor: { active: true }, id: { notIn: ids } },
      include: productCardInclude,
      take: limit,
    }),
  ]);
  const ranked = ids.map((id) => sold.find((p) => p.id === id)!).filter(Boolean);
  return [...ranked, ...featured].slice(0, limit);
}

const TRUST = [
  { icon: "✡️", title: "Certified kosher", body: "Every shop's hechsher shown, every item marked meat, dairy or pareve." },
  { icon: "🚚", title: "NYC next-day", body: `Our courier delivers across the five boroughs for ${formatMoney(localDelivery.fee)}.` },
  { icon: "📦", title: "Shipped nationwide", body: "Packed cold and sent overnight, so it arrives fresh anywhere in the US." },
  { icon: "🕯️", title: "Never on Shabbat", body: "Nothing is prepared or delivered on Shabbat or Yom Tov." },
];


export default async function HomePage() {
  const today = localNow(new Date()).day;
  const holiday = upcomingHoliday(today, 21);
  const active = { active: true, vendor: { active: true } } as const;
  const [top, newest, gifts, vendors, categoryRows, reviews] = await Promise.all([
    bestsellers(12),
    db.product.findMany({ where: active, orderBy: { createdAt: "desc" }, take: 12, include: productCardInclude }),
    // Shelf-stable items ship anywhere, 2-day: the easy gifts.
    db.product.findMany({ where: { ...active, OR: [{ category: "Gifts" }, { perishable: false }] }, orderBy: [{ featured: "desc" }, { ratingCount: "desc" }], take: 12, include: productCardInclude }),
    db.vendor.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 12,
      include: { products: { where: { active: true }, orderBy: [{ featured: "desc" }, { ratingCount: "desc" }], take: 1, include: mainPhoto } },
    }),
    db.product.findMany({ where: active, include: mainPhoto, orderBy: [{ featured: "desc" }, { ratingCount: "desc" }] }),
    db.review.findMany({
      where: { hidden: false, rating: 5 },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { product: { select: { name: true, slug: true } }, vendor: { select: { name: true } } },
    }),
  ]);

  // One circle per category, pictured by its best product.
  const categories = [...new Map(categoryRows.map((p) => [p.category, p])).values()];
  const heroProduct = categoryRows.find((p) => p.images.length > 0) ?? categoryRows[0];

  const ratings = await db.product.groupBy({
    by: ["vendorId"],
    where: { vendorId: { in: vendors.map((v) => v.id) } },
    _sum: { ratingCount: true, ratingSum: true },
  });
  const vendorRating = (id: string) => {
    const r = ratings.find((x) => x.vendorId === id);
    const count = r?._sum.ratingCount ?? 0;
    return count > 0 ? { avg: (r!._sum.ratingSum ?? 0) / count, count } : null;
  };

  const row = (title: string, subtitle: string, products: typeof top, href = "/shop") =>
    products.length > 0 && (
      <section>
        <SectionHeading title={title} subtitle={subtitle} href={href} />
        <Carousel label={title}>
          {products.map((p) => (
            <CarouselItem key={p.id} className="w-60 sm:w-64">
              <ProductCard product={p} />
            </CarouselItem>
          ))}
        </Carousel>
      </section>
    );

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid overflow-hidden rounded-3xl bg-amber-50 md:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-12 sm:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Certified kosher · Shipped nationwide</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-stone-900 sm:text-5xl">
            The kosher food people line up for, delivered to your door.
          </h1>
          <p className="mt-4 text-lg text-stone-700">
            Iconic bakeries, markets and chocolatiers. Next-day in NYC, packed cold and shipped fresh everywhere else.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-full bg-stone-900 px-7 py-3.5 font-semibold text-white hover:bg-stone-700">Shop now</Link>
            <Link href="/shop?category=Gifts" className="rounded-full border-2 border-stone-900 px-7 py-3 font-semibold text-stone-900 hover:bg-white">Send a gift</Link>
          </div>
        </div>
        {heroProduct && (
          <Link href={`/products/${heroProduct.slug}`} className="relative min-h-72 md:min-h-full" aria-label={heroProduct.name}>
            <ProductImage emoji={heroProduct.emoji} imageUrl={productPhotoUrl(heroProduct, "large")} accent="#c2410c" className="text-9xl" />
          </Link>
        )}
      </section>

      {/* Holiday */}
      {holiday && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-stone-900 px-6 py-5 text-white sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-xl font-bold">⚡ Get it before {holiday.name}</h2>
            <p className="mt-1 text-sm text-stone-300">
              Yom Tov begins at sundown on {formatDeliveryDate(holiday.erev)}. Add priority delivery at checkout and it&apos;s guaranteed to arrive in time.
            </p>
          </div>
          <Link href="/shop" className="shrink-0 rounded-full bg-white px-6 py-2.5 font-semibold text-stone-900 hover:bg-amber-100">Shop for Yom Tov</Link>
        </section>
      )}

      {/* Category circles */}
      {categories.length > 0 && (
        <section>
          <SectionHeading title="Shop by category" />
          <Carousel label="Categories">
            {categories.map((p) => (
              <CarouselItem key={p.category} className="w-28 sm:w-32">
                <Link href={`/shop?category=${encodeURIComponent(p.category)}`} className="group block text-center">
                  <span className="mx-auto block aspect-square w-24 overflow-hidden rounded-full ring-2 ring-transparent transition group-hover:ring-stone-900 sm:w-28">
                    <ProductImage emoji={p.emoji} imageUrl={productPhotoUrl(p)} accent="#c2410c" className="text-4xl" />
                  </span>
                  <span className="mt-2 block text-sm font-semibold group-hover:text-brand">{p.category}</span>
                </Link>
              </CarouselItem>
            ))}
          </Carousel>
        </section>
      )}

      {row("Top sellers", "What everyone's ordering right now", top)}

      {/* Featured shops */}
      {vendors.length > 0 && (
        <section>
          <SectionHeading title="Featured shops" subtitle="Local legends, every one certified kosher" href="/vendors" />
          <Carousel label="Featured shops">
            {vendors.map((v) => {
              const hero = v.products[0];
              const rating = vendorRating(v.id);
              return (
                <CarouselItem key={v.id} className="w-72">
                  <Link href={`/vendors/${v.slug}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                      <ProductImage emoji={hero?.emoji ?? v.emoji} imageUrl={hero ? productPhotoUrl(hero) : null} accent={v.accentColor} className="transition duration-300 group-hover:scale-105" />
                      <span className="absolute -bottom-0 left-4 flex h-14 w-14 translate-y-1/3 items-center justify-center rounded-full border-4 border-white bg-white text-2xl shadow" aria-hidden>{v.emoji}</span>
                    </div>
                    <div className="px-1 pt-6">
                      <h3 className="font-bold group-hover:text-brand">{v.name}</h3>
                      <p className="text-sm text-stone-500">{[vendorLocation(v), v.certification && `Certified ${v.certification}`].filter(Boolean).join(" · ")}</p>
                      {rating && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-600">
                          <Stars rating={rating.avg} /> {rating.avg.toFixed(1)} ({rating.count})
                        </p>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </Carousel>
        </section>
      )}

      {row("Great for gifting", "Ships anywhere, with a gift note and the delivery day you choose", gifts, "/shop?category=Gifts")}
      {row("New arrivals", "Just added by our shops", newest, "/shop?sort=newest")}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section>
          <SectionHeading title="Loved by customers" subtitle="Real reviews from verified purchases" />
          <Carousel label="Customer reviews">
            {reviews.map((r) => (
              <CarouselItem key={r.id} className="w-80">
                <figure className="flex h-full flex-col rounded-2xl border border-stone-200 p-6">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-3 line-clamp-5 flex-1 text-stone-700">&ldquo;{r.body}&rdquo;</blockquote>
                  <figcaption className="mt-4 text-sm text-stone-500">
                    {r.authorName} on{" "}
                    <Link href={`/products/${r.product.slug}`} className="font-semibold text-stone-800 hover:text-brand">{r.product.name}</Link>
                    <span className="block text-xs">{r.vendor.name} · ✓ Verified purchase</span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </Carousel>
        </section>
      )}

      {/* Why us */}
      <section className="grid gap-8 rounded-3xl bg-stone-50 px-6 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-sm" aria-hidden>{t.icon}</span>
            <h3 className="mt-3 font-bold">{t.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{t.body}</p>
          </div>
        ))}
      </section>
      <p className="text-center text-sm text-stone-500">
        Order before {site.orderCutoffHour % 12 || 12}pm ET for next-day NYC delivery. We close for Shabbat on Fridays at {site.erevCloseHour % 12 || 12}pm ET.
      </p>
    </div>
  );
}

function SectionHeading({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-stone-900 underline underline-offset-4 hover:text-brand">
          Shop all
        </Link>
      )}
    </div>
  );
}
