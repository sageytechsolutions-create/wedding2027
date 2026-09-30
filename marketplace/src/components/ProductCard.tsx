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
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100">
        <ProductImage emoji={product.emoji} imageUrl={productPhotoUrl(product)} alt={product.name} accent={product.vendor.accentColor} className="transition duration-300 group-hover:scale-105" />
      </div>
      <div className="px-0.5 pt-3">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-stone-900">{product.vendor.name}</p>
        {vendorLocation(product.vendor) && <p className="truncate text-xs text-stone-500">{vendorLocation(product.vendor)}</p>}
        <h3 className="mt-1 line-clamp-2 leading-snug text-stone-800 group-hover:underline">{product.name}</h3>
        {product.ratingCount ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <Stars rating={product.ratingSum! / product.ratingCount} /> ({product.ratingCount})
          </div>
        ) : null}
        <div className="mt-1.5">
          <KosherBadges kosherType={product.kosherType} kosherForPassover={product.kosherForPassover} labels={product.labels} />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between text-sm">
          <span className="font-bold text-stone-900">{formatMoney(product.price)}</span>
          {product.serves && <span className="text-xs text-stone-500">Serves {product.serves}</span>}
        </div>
      </div>
    </Link>
  );
}
