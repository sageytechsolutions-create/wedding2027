import Link from "next/link";
import { KosherBadges } from "./KosherBadges";
import { formatMoney, vendorLocation } from "@/lib/money";
import { productPhotoUrl } from "@/lib/photos";
import { Stars } from "./Stars";

export interface ProductCardData {
  slug: string;
  name: string;
  price: number;
  emoji: string;
  imageUrl: string | null;
  images?: { id: string }[];
  ratingCount?: number;
  ratingSum?: number;
  serves: string | null;
  kosherType: string;
  kosherForPassover: boolean;
  labels: string;
  vendor: { name: string; city: string; state: string; accentColor: string };
}

export function ProductImage({ emoji, imageUrl, accent, alt = "", className = "" }: { emoji: string; imageUrl: string | null; accent: string; alt?: string; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}55)` }}
    >
      <span className="text-6xl" aria-hidden>{emoji}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/products/${product.slug}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden">
        <ProductImage emoji={product.emoji} imageUrl={productPhotoUrl(product)} alt={product.name} accent={product.vendor.accentColor} className="transition group-hover:scale-105" />
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {[product.vendor.name, vendorLocation(product.vendor)].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-1 font-semibold leading-snug group-hover:text-brand">{product.name}</h3>
        {product.ratingCount ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <Stars rating={product.ratingSum! / product.ratingCount} /> ({product.ratingCount})
          </div>
        ) : null}
        <div className="mt-2">
          <KosherBadges kosherType={product.kosherType} kosherForPassover={product.kosherForPassover} labels={product.labels} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-semibold">{formatMoney(product.price)}</span>
          {product.serves && <span className="text-stone-500">Serves {product.serves}</span>}
        </div>
      </div>
    </Link>
  );
}
