import Link from "next/link";
import { Stars } from "@/components/Stars";
import { setReviewHiddenAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdmin("/admin/reviews");
  const { filter } = await searchParams;
  const where = filter === "low" ? { rating: { lte: 2 } } : filter === "hidden" ? { hidden: true } : {};
  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { name: true, slug: true } }, vendor: { select: { name: true } }, orderItem: { include: { vendorOrder: { include: { order: { select: { number: true } } } } } } },
  });
  const tab = (key: string | undefined, label: string) => (
    <Link href={key ? `/admin/reviews?filter=${key}` : "/admin/reviews"} className={`rounded-full px-3 py-1 text-sm ${filter === key ? "bg-brand text-white" : "border border-stone-200 bg-white"}`}>
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand">← Admin</Link>
        <h1 className="mt-1 font-display text-3xl font-bold">Reviews</h1>
        <p className="mt-1 text-sm text-stone-500">Hide reviews that are abusive, off-topic, or share personal information. Hidden reviews don&apos;t count toward star ratings.</p>
      </div>
      <div className="flex gap-2">
        {tab(undefined, "All")}
        {tab("low", "1–2 stars")}
        {tab("hidden", "Hidden")}
      </div>
      {reviews.length === 0 ? (
        <p className="text-stone-500">No reviews here.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {reviews.map((r) => (
            <li key={r.id} className={`space-y-1 px-5 py-4 ${r.hidden ? "bg-stone-50" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars rating={r.rating} />
                <Link href={`/products/${r.product.slug}#reviews`} className="font-medium hover:text-brand">{r.product.name}</Link>
                <span className="text-stone-500">
                  · {r.vendor.name} · {r.authorName} · order {r.orderItem.vendorOrder.order.number}
                </span>
                <form action={setReviewHiddenAction} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="hidden" value={r.hidden ? "false" : "true"} />
                  <button className={`text-sm ${r.hidden ? "text-brand" : "text-stone-500 hover:text-red-600"}`}>{r.hidden ? "Show again" : "Hide"}</button>
                </form>
              </div>
              {r.title && <p className="font-semibold">{r.title}</p>}
              <p className="whitespace-pre-line text-sm text-stone-700">{r.body}</p>
              {r.vendorReply && <p className="text-sm text-stone-500">Vendor reply: {r.vendorReply}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
