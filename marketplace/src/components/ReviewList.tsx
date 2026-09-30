import { Stars } from "./Stars";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: Date;
  vendorReply: string | null;
};

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

export function ReviewList({ reviews, vendorName }: { reviews: ReviewRow[]; vendorName: string }) {
  if (reviews.length === 0) return <p className="text-stone-500">No reviews yet. Customers can review items after they arrive.</p>;
  return (
    <ul className="space-y-6">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-stone-200 pb-6 last:border-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={r.rating} />
            {r.title && <span className="font-semibold">{r.title}</span>}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {r.authorName} · {date(r.createdAt)} · <span className="text-emerald-700">✓ Verified purchase</span>
          </p>
          <p className="mt-2 whitespace-pre-line text-stone-700">{r.body}</p>
          {r.vendorReply && (
            <div className="mt-3 rounded-lg bg-stone-100 p-3 text-sm">
              <p className="font-medium">Reply from {vendorName}</p>
              <p className="mt-1 whitespace-pre-line text-stone-700">{r.vendorReply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
