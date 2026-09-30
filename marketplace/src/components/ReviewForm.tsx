"use client";

import { useActionState, useState } from "react";
import { submitReviewAction } from "@/lib/actions";

const field = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

export function ReviewForm({ number, email, orderItemId, itemName }: { number: string; email: string; orderItemId: string; itemName: string }) {
  const [state, action, pending] = useActionState(submitReviewAction, undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state?.done) return <p className="text-sm text-emerald-700">Thanks for reviewing {itemName}! ★</p>;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <fieldset>
        <legend className="text-sm font-medium">Rate {itemName}</legend>
        <div className="flex text-2xl" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className={(hover || rating) >= n ? "text-amber-500" : "text-stone-300"}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      {rating > 0 && (
        <>
          <input name="title" maxLength={80} placeholder="Headline (optional)" className={field} />
          <textarea name="body" required minLength={10} maxLength={2000} rows={3} placeholder="What did you think? How was the taste, the packaging, the delivery?" className={field} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Posting…" : "Post review"}
          </button>
          <p className="text-xs text-stone-500">Shown publicly with your first name and last initial.</p>
        </>
      )}
    </form>
  );
}
