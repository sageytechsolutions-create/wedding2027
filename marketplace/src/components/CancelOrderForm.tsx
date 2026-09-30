"use client";

import { useActionState, useState } from "react";
import { cancelOrderAction } from "@/lib/actions";
import { formatMoney } from "@/lib/money";

export function CancelOrderForm({ vendorOrderId, amount, onTheWay }: { vendorOrderId: string; amount: number; onTheWay: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelOrderAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-stone-500 hover:text-red-600">
        Cancel &amp; refund…
      </button>
    );
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Cancel this order and refund the customer ${formatMoney(amount)}? This can't be undone.`)) e.preventDefault();
      }}
      className="w-full space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
    >
      <input type="hidden" name="id" value={vendorOrderId} />
      <p className="text-red-900">
        The customer is refunded <strong>{formatMoney(amount)}</strong> (items plus delivery) and emailed the reason below.
        {onTheWay && " This order is already on its way."}
      </p>
      <textarea
        name="reason"
        required
        minLength={3}
        maxLength={300}
        rows={2}
        placeholder="Reason for the customer, e.g. “We're out of challah this week, sorry!”"
        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2"
      />
      {state?.error && <p className="text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {pending ? "Refunding…" : `Cancel & refund ${formatMoney(amount)}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-stone-600">Keep order</button>
      </div>
    </form>
  );
}
