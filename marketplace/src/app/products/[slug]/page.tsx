import { kosherLabels } from "@/lib/kosher";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { KosherBadges } from "@/components/KosherBadges";
import { Carousel, CarouselItem } from "@/components/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ReviewList } from "@/components/ReviewList";
import { Stars } from "@/components/Stars";
import { averageRating } from "@/lib/reviews";
import { db } from "@/lib/db";
import { mainPhoto, productPhotoUrl } from "@/lib/photos";
import { siteUrl } from "@/lib/stripe";
import { formatMoney, vendorLocation } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { vendor: { select: { name: true } }, ...mainPhoto } });
  const photo = product && productPhotoUrl(product, "large");
  if (!product) return {};
  const title = `${product.name} from ${product.vendor.name}`;
  return {
    title,
    description: product.description.slice(0, 160),
    openGraph: { title, description: product.description.slice(0, 160), ...(photo && { images: [new URL(photo, siteUrl()).toString()] }) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      vendor: true,
      images: { orderBy: { position: "asc" }, select: { id: true } },
      reviews: { where: { hidden: false }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!product || !product.active || !product.vendor.active) notFound();
  const { vendor } = product;
  const moreFromShop = await db.product.findMany({
    where: { vendorId: vendor.id, active: true, id: { not: product.id } },
    orderBy: [{ featured: "desc" }, { ratingCount: "desc" }],
    take: 12,
    include: { vendor: { select: { name: true, city: true, state: true, accentColor: true } }, ...mainPhoto },
  });
  const average = averageRating(product);
  const photo = productPhotoUrl(product, "large");
  // Structured data so search engines can show price and star ratings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(photo && { image: new URL(photo, siteUrl()).toString() }),
    brand: { "@type": "Brand", name: vendor.name },
    offers: { "@type": "Offer", price: (product.price / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock" },
    ...(average != null && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: product.ratingCount },
    }),
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
      <Link href="/" className="hover:text-stone-900">Home</Link> <span aria-hidden>/</span>{" "}
      <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-stone-900">{product.category}</Link>{" "}
      <span aria-hidden>/</span> <span className="text-stone-900">{product.name}</span>
    </nav>
    <div className="mt-4 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <ProductGallery
          name={product.name}
          emoji={product.emoji}
          accent={vendor.accentColor}
          photoIds={product.images.map((i) => i.id)}
          fallbackUrl={product.imageUrl}
        />
      </div>
      <div>
        <Link href={`/vendors/${vendor.slug}`} className="text-sm font-bold uppercase tracking-wide text-stone-900 hover:text-brand">
          {vendor.name}
        </Link>
        {vendorLocation(vendor) && <p className="text-sm text-stone-500">{vendorLocation(vendor)}</p>}
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
        {average != null && (
          <a href="#reviews" className="mt-2 flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900">
            <Stars rating={average} /> {average.toFixed(1)} · <span className="underline underline-offset-2">{product.ratingCount} review{product.ratingCount === 1 ? "" : "s"}</span>
          </a>
        )}
        <p className="mt-4 text-3xl font-bold">{formatMoney(product.price)}</p>
        {product.serves && <p className="mt-1 text-stone-600">Serves {product.serves}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <KosherBadges kosherType={product.kosherType} kosherForPassover={product.kosherForPassover} labels={product.labels} />
          {vendor.certification && (
            <span className="rounded-full border border-stone-300 px-2 py-0.5 text-xs font-medium text-stone-700">✡️ Certified {vendor.certification}</span>
          )}
        </div>

        <div className="mt-6 border-y border-stone-200 py-6">
          <AddToCartButton
            withQuantity
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              emoji: product.emoji,
              photo: productPhotoUrl(product),
              vendorId: vendor.id,
              vendorName: vendor.name,
            }}
          />
          <div className="mt-4">
            <DeliveryEstimator productId={product.id} />
          </div>
        </div>

        <div className="divide-y divide-stone-200">
          <details open className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              About this item <span aria-hidden className="transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 whitespace-pre-line text-stone-700">{product.description}</p>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Shipping &amp; storage <span aria-hidden className="transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 text-stone-700">
              {product.perishable
                ? "Perishable. Packed cold and shipped Monday–Thursday and never before Yom Tov, so it never sits in a warehouse over Shabbat or a holiday. Refrigerate as soon as it arrives."
                : "Shelf-stable. Ships Monday–Friday, with 2-day shipping available."}{" "}
              <Link href="/shipping" className="underline underline-offset-2">Shipping &amp; refunds policy</Link>
            </p>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Kosher details <span aria-hidden className="transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 text-stone-700">
              {kosherLabels[product.kosherType]?.label ?? product.kosherType}
              {vendor.certification ? `. Certified by ${vendor.certification}.` : ". Certification details from the shop on request."}
            </p>
          </details>
        </div>

        <Link href={`/vendors/${vendor.slug}`} className="mt-6 flex items-center gap-4 rounded-2xl bg-stone-50 p-4 hover:bg-stone-100">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm" aria-hidden>{vendor.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{vendor.name}</span>
            <span className="block truncate text-sm text-stone-600">{vendor.tagline}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold underline underline-offset-4">Visit shop</span>
        </Link>
      </div>
    </div>

    <section id="reviews" className="mt-20 grid gap-10 border-t border-stone-200 pt-12 lg:grid-cols-[280px_1fr]">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reviews</h2>
        {average != null ? (
          <div className="mt-3">
            <p className="text-5xl font-bold">{average.toFixed(1)}</p>
            <Stars rating={average} size="lg" />
            <p className="mt-1 text-sm text-stone-600">{product.ratingCount} verified review{product.ratingCount === 1 ? "" : "s"}</p>
          </div>
        ) : null}
      </div>
      <ReviewList reviews={product.reviews} vendorName={vendor.name} />
    </section>

    {moreFromShop.length > 0 && (
      <section className="mt-20">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">More from {vendor.name}</h2>
          <Link href={`/vendors/${vendor.slug}`} className="shrink-0 text-sm font-semibold underline underline-offset-4">Shop all</Link>
        </div>
        <Carousel label={`More from ${vendor.name}`}>
          {moreFromShop.map((p) => (
            <CarouselItem key={p.id} className="w-60 sm:w-64">
              <ProductCard product={p} />
            </CarouselItem>
          ))}
        </Carousel>
      </section>
    )}
    </>
  );
}
