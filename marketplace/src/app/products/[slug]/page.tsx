import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { KosherBadges } from "@/components/KosherBadges";
import { ProductGallery } from "@/components/ProductGallery";
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
    include: { vendor: true, images: { orderBy: { position: "asc" }, select: { id: true } } },
  });
  if (!product || !product.active || !product.vendor.active) notFound();
  const { vendor } = product;

  return (
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
  );
}
