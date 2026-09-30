import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { KosherBadges } from "@/components/KosherBadges";
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
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery
        name={product.name}
        emoji={product.emoji}
        accent={vendor.accentColor}
        photoIds={product.images.map((i) => i.id)}
        fallbackUrl={product.imageUrl}
      />
      <div>
        <Link href={`/vendors/${vendor.slug}`} className="text-sm font-medium uppercase tracking-wide text-brand">
          {vendor.emoji} {[vendor.name, vendorLocation(vendor)].filter(Boolean).join(" · ")}
        </Link>
        <h1 className="mt-2 font-display text-4xl font-bold">{product.name}</h1>
        {average != null && (
          <a href="#reviews" className="mt-2 flex items-center gap-2 text-sm text-stone-600 hover:text-brand">
            <Stars rating={average} /> {average.toFixed(1)} · {product.ratingCount} review{product.ratingCount === 1 ? "" : "s"}
          </a>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KosherBadges kosherType={product.kosherType} kosherForPassover={product.kosherForPassover} labels={product.labels} />
          {vendor.certification && <span className="text-sm text-stone-600">Certified by {vendor.certification}</span>}
        </div>
        <p className="mt-3 text-2xl font-semibold">{formatMoney(product.price)}</p>
        {product.serves && <p className="mt-1 text-stone-500">Serves {product.serves}</p>}
        <p className="mt-6 text-lg text-stone-700">{product.description}</p>
        <div className="mt-8">
          <AddToCartButton
            withQuantity
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              emoji: product.emoji,
              vendorId: vendor.id,
              vendorName: vendor.name,
            }}
          />
        </div>
        <div className="mt-8">
          <DeliveryEstimator productId={product.id} />
        </div>
        <p className="mt-6 text-sm text-stone-500">
          {product.perishable
            ? "Perishable. Packed cold and shipped Monday–Thursday and never before Yom Tov, so it never sits in a warehouse over Shabbat or a holiday."
            : "Shelf-stable. Ships Monday–Friday."}
        </p>
      </div>
    </div>
    <section id="reviews" className="mt-16 max-w-3xl">
      <h2 className="font-display text-2xl font-bold">Reviews</h2>
      {average != null && (
        <p className="mt-2 flex items-center gap-2 text-stone-600">
          <Stars rating={average} size="lg" /> {average.toFixed(1)} out of 5 · {product.ratingCount} review{product.ratingCount === 1 ? "" : "s"}
        </p>
      )}
      <div className="mt-6">
        <ReviewList reviews={product.reviews} vendorName={vendor.name} />
      </div>
    </section>
    </>
  );
}
