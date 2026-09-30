"use client";

import { useState } from "react";
import { formatDeliveryDate, methodLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { fetchQuote, type GroupQuote } from "@/lib/quote-client";

export function DeliveryEstimator({ productId }: { productId: string }) {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<GroupQuote | null>(null);
  const [error, setError] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { groups } = await fetchQuote(zip, [{ productId, quantity: 1 }]);
      setResult(groups[0] ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const q = result?.quote;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <form onSubmit={check} className="flex gap-2">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          placeholder="Your ZIP code"
          aria-label="ZIP code"
          className="w-36 rounded-lg border border-stone-300 px-3 py-2"
        />
        <button className="rounded-lg border border-stone-900 px-4 py-2 text-sm font-medium hover:bg-stone-900 hover:text-white">
          When can I get it?
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {q && !q.available && <p className="mt-3 text-sm text-red-600">{q.reason}</p>}
      {q?.available && (
        <ul className="mt-3 space-y-1 text-sm">
          {q.options.map((o) => (
            <li key={o.method}>
              <strong>{methodLabel(o.method)}</strong>: arrives <strong>{formatDeliveryDate(o.deliveryDate)}</strong>
              {" · "}
              {o.fee === 0 ? "Free" : formatMoney(o.fee)}
            </li>
          ))}
          {q.options.some((o) => o.priority) && (
            <li className="text-amber-800">⚡ Priority delivery before {q.holiday?.name} available at checkout.</li>
          )}
        </ul>
      )}
    </div>
  );
}
