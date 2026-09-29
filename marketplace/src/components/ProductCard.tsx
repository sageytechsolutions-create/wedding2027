import Link from "next/link";
import { KosherBadges } from "./KosherBadges";
import { formatMoney } from "@/lib/money";

export interface ProductCardData {
  slug: string;
  name: string;
  price: number;
  emoji: string;
  imageUrl: string | null;
  serves: string | null;
  kosherType: string;
  kosherForPassover: boolean;
  vendor: { name: string; city: string; state: string; accentColor: string };
}

export function ProductImage({ emoji, imageUrl, accent, className = "" }: { emoji: string; imageUrl: string | null; accent: string; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`h-full w-full object-cover ${className}`} />;
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
        <ProductImage emoji={product.emoji} imageUrl={product.imageUrl} accent={product.vendor.accentColor} className="transition group-hover:scale-105" />
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {product.vendor.name} · {product.vendor.city}, {product.vendor.state}
        </p>
        <h3 className="mt-1 font-semibold leading-snug group-hover:text-brand">{product.name}</h3>
        <div className="mt-2">
          <KosherBadges kosherType={product.kosherType} kosherForPassover={product.kosherForPassover} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-semibold">{formatMoney(product.price)}</span>
          {product.serves && <span className="text-stone-500">Serves {product.serves}</span>}
        </div>
      </div>
    </Link>
  );
}
