import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";
import { mainPhoto } from "@/lib/photos";
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
    db.product.findMany({ where, orderBy, include: { vendor: { select: { name: true, city: true, state: true, accentColor: true } }, ...mainPhoto } }),
    db.product.findMany({ where: { active: true }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);

  const href = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(q && { q }), ...(category && { category }), ...(kosher && { kosher }), ...(label && { label }), ...(sort !== "featured" && { sort }), ...params });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    return `/shop?${sp}`;
  };

  const title = q ? `Results for “${q}”` : category || (kosher === "passover" ? "Kosher for Passover" : "Shop all");
  const kosherName = kosher === "passover" ? "Kosher for Passover" : kosherLabels[kosher]?.label;
  // Active filters, each with the link that removes it.
  const active: { label: string; clear: Record<string, string> }[] = [];
  if (category) active.push({ label: category, clear: { category: "" } });
  if (kosherName) active.push({ label: kosherName, clear: { kosher: "" } });
  if (label in KOSHER_LABELS) active.push({ label: KOSHER_LABELS[label as keyof typeof KOSHER_LABELS], clear: { label: "" } });
  if (q) active.push({ label: `“${q}”`, clear: { q: "" } });

  const filters = (
    <div className="space-y-7 text-sm">
      <FilterGroup title="Category">
        <FilterLink href={href({ category: "" })} on={!category}>All categories</FilterLink>
        {categories.map((c) => (
          <FilterLink key={c.category} href={href({ category: c.category })} on={category === c.category}>{c.category}</FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="Kosher">
        <FilterLink href={href({ kosher: "" })} on={!kosher}>Meat, dairy &amp; pareve</FilterLink>
        {KOSHER_TYPES.map((k) => (
          <FilterLink key={k} href={href({ kosher: k })} on={kosher === k}>{kosherLabels[k].label}</FilterLink>
        ))}
        <FilterLink href={href({ kosher: "passover" })} on={kosher === "passover"}>Kosher for Passover</FilterLink>
      </FilterGroup>
      <FilterGroup title="Hashgacha standard">
        <FilterLink href={href({ label: "" })} on={!label}>Any</FilterLink>
        {Object.entries(KOSHER_LABELS).map(([k, v]) => (
          <FilterLink key={k} href={href({ label: k })} on={label === k}>{v}</FilterLink>
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">Home</Link> <span aria-hidden>/</span>{" "}
        {category ? <Link href="/shop" className="hover:text-stone-900">Shop</Link> : <span className="text-stone-900">Shop</span>}
        {category && <> <span aria-hidden>/</span> <span className="text-stone-900">{category}</span></>}
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-1 text-stone-500">{products.length} item{products.length === 1 ? "" : "s"}</p>
        </div>
        <form action="/shop" className="flex items-center gap-2 text-sm">
          {q && <input type="hidden" name="q" value={q} />}
          {category && <input type="hidden" name="category" value={category} />}
          {kosher && <input type="hidden" name="kosher" value={kosher} />}
          {label && <input type="hidden" name="label" value={label} />}
          <label htmlFor="sort" className="text-stone-500">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} className="rounded-full border border-stone-300 bg-white px-3 py-2 font-medium">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
          <button className="rounded-full bg-stone-900 px-4 py-2 font-semibold text-white">Apply</button>
        </form>
      </div>

      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {active.map((f) => (
            <Link key={f.label} href={href(f.clear)} className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 font-medium hover:bg-stone-200">
              {f.label} <span aria-label={`Remove ${f.label}`}>✕</span>
            </Link>
          ))}
          <Link href="/shop" className="font-medium text-stone-500 underline underline-offset-4 hover:text-stone-900">Clear all</Link>
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <details className="rounded-2xl border border-stone-200 p-4 lg:hidden">
          <summary className="cursor-pointer font-semibold">Filters</summary>
          <div className="mt-4">{filters}</div>
        </details>

        {products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-semibold">Nothing matches that yet.</p>
            <p className="mt-1 text-stone-500">Try fewer filters or a different search.</p>
            <Link href="/shop" className="mt-4 inline-block rounded-full bg-stone-900 px-6 py-2.5 font-semibold text-white">See everything</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-900">{title}</h2>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function FilterLink({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} aria-current={on ? "true" : undefined} className={on ? "font-semibold text-stone-900" : "text-stone-600 hover:text-stone-900"}>
        {on && <span aria-hidden>● </span>}
        {children}
      </Link>
    </li>
  );
}
