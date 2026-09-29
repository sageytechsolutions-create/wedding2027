import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

const SORTS = {
  featured: [{ featured: "desc" }, { createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  newest: [{ createdAt: "desc" }],
} satisfies Record<string, Prisma.ProductOrderByWithRelationInput[]>;

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; sort?: string }> }) {
  const { q = "", category = "", sort = "featured" } = await searchParams;
  const orderBy = SORTS[sort as keyof typeof SORTS] ?? SORTS.featured;

  const where: Prisma.ProductWhereInput = {
    active: true,
    vendor: { active: true },
    ...(category && { category }),
    ...(q && {
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { vendor: { name: { contains: q } } },
        { vendor: { city: { contains: q } } },
      ],
    }),
  };

  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy, include: { vendor: { select: { name: true, city: true, state: true, accentColor: true } } } }),
    db.product.findMany({ where: { active: true }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);

  const href = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(q && { q }), ...(category && { category }), ...(sort !== "featured" && { sort }), ...params });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    return `/shop?${sp}`;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{category || "All food"}</h1>
      <form className="mt-6 flex flex-wrap gap-3" action="/shop">
        <input name="q" defaultValue={q} placeholder="Search bagels, brisket, Chicago…" className="min-w-64 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2" />
        {category && <input type="hidden" name="category" value={category} />}
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
