"use client";

import { useActionState } from "react";
import { refundPriorityFeeAction } from "@/lib/actions";
import { formatMoney } from "@/lib/money";

// Admin-only: honor the on-time guarantee for a late priority order.
export function RefundPriorityButton({ vendorOrderId, amount }: { vendorOrderId: string; amount: number }) {
  const [state, action, pending] = useActionState(refundPriorityFeeAction, undefined);
  if (state?.refunded != null && !state.error) {
    return <span className="text-sm text-emerald-700">Priority fee refunded{state.warning && `. ${state.warning}`}</span>;
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Refund the ${formatMoney(amount)} priority fee because this order was late?`)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={vendorOrderId} />
      <button disabled={pending} className="text-sm font-medium text-amber-800 hover:text-amber-950 disabled:opacity-50">
        {pending ? "Refunding…" : `Refund ${formatMoney(amount)} priority fee (late)`}
      </button>
      {state?.error && <span className="ml-2 text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
