import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";
import { KOSHER_LABELS, KOSHER_TYPES, kosherLabels } from "@/lib/kosher";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

const SORTS = {
  featured: [{ featured: "desc" }, { createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  newest: [{ createdAt: "desc" }],
} satisfies Record<string, Prisma.ProductOrderByWithRelationInput[]>;

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; sort?: string; kosher?: string; label?: string }> }) {
  const { q = "", category = "", sort = "featured", kosher = "", label = "" } = await searchParams;
  const orderBy = SORTS[sort as keyof typeof SORTS] ?? SORTS.featured;

  const where: Prisma.ProductWhereInput = {
    active: true,
    vendor: { active: true },
    ...(category && { category }),
    ...(kosher === "passover" ? { kosherForPassover: true } : (KOSHER_TYPES as readonly string[]).includes(kosher) && { kosherType: kosher }),
    ...(label in KOSHER_LABELS && { labels: { contains: label } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { vendor: { name: { contains: q, mode: "insensitive" } } },
        { vendor: { city: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy, include: { vendor: { select: { name: true, city: true, state: true, accentColor: true } } } }),
    db.product.findMany({ where: { active: true }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);

  const href = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(q && { q }), ...(category && { category }), ...(kosher && { kosher }), ...(label && { label }), ...(sort !== "featured" && { sort }), ...params });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    return `/shop?${sp}`;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{category || "All food"}</h1>
      <form className="mt-6 flex flex-wrap gap-3" action="/shop">
        <input name="q" defaultValue={q} placeholder="Search challah, brisket, Brooklyn…" className="min-w-64 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2" />
        {category && <input type="hidden" name="category" value={category} />}
        <select name="kosher" defaultValue={kosher} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
          <option value="">Meat, dairy & pareve</option>
          {KOSHER_TYPES.map((k) => <option key={k} value={k}>{kosherLabels[k].label}</option>)}
          <option value="passover">Kosher for Passover</option>
        </select>
        <select name="label" defaultValue={label} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
          <option value="">Any hashgacha standard</option>
          {Object.entries(KOSHER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
        <button className="rounded-lg bg-stone-900 px-5 py-2 font-medium text-white">Search</button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={href({ category: "" })} className={`rounded-full px-3 py-1 text-sm ${!category ? "bg-brand text-white" : "bg-white border border-stone-200"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.category} href={href({ category: c.category })} className={`rounded-full px-3 py-1 text-sm ${category === c.category ? "bg-brand text-white" : "bg-white border border-stone-200"}`}>
            {c.category}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-stone-500">Nothing matches that search yet.</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
