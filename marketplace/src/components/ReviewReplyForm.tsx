"use client";

import { useActionState, useState } from "react";
import { replyToReviewAction } from "@/lib/actions";

export function ReviewReplyForm({ reviewId, existing }: { reviewId: string; existing: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(replyToReviewAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand">
        {existing ? "Edit your reply" : "Reply publicly"}
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={reviewId} />
      <textarea
        name="reply"
        defaultValue={existing ?? ""}
        maxLength={1000}
        rows={3}
        placeholder="Thank them, or explain what you'll do differently. Shown under the review. Leave empty to remove your reply."
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.done && <p className="text-sm text-emerald-700">Saved.</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save reply</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500">Close</button>
      </div>
    </form>
  );
}
