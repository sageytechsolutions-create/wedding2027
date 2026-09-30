"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import { formatDeliveryDate, methodLabel, type DeliveryOption } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import { fetchQuote, type GroupQuote } from "@/lib/quote-client";

const US_STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export function CheckoutForm({ stripeEnabled, cancelled }: { stripeEnabled: boolean; cancelled: boolean }) {
  const { lines, ready, subtotal } = useCart();
  // Per vendor: chosen delivery method and whether priority holiday delivery is on.
  const [choices, setChoices] = useState<Record<string, { method?: string; priority: boolean }>>({});
  const [zip, setZip] = useState("");
  const [quotes, setQuotes] = useState<GroupQuote[] | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (zip.length !== 5 || lines.length === 0) {
      setQuotes(null);
      return;
    }
    let cancelled = false;
    fetchQuote(zip, JSON.parse(itemsKey))
      .then((r) => !cancelled && setQuotes(r.groups))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, itemsKey]);

  if (!ready) return null;
  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Nothing to check out</h1>
        <Link href="/shop" className="mt-6 inline-block text-brand">Browse the shop →</Link>
      </div>
    );
  }

  const blocked = quotes?.filter((g) => !g.quote.available) ?? [];
  // The option in effect for a vendor: their pick if the current quote still offers it, else the default.
  const selected = (g: GroupQuote): { option: DeliveryOption; priority: boolean } | null => {
    if (!g.quote.available) return null;
    const choice = choices[g.vendorId];
    const option = g.quote.options.find((o) => o.method === choice?.method) ?? g.quote.options[0];
    return { option, priority: !!choice?.priority && !!option.priority };
  };
  const shipping =
    quotes?.reduce((s, g) => {
      const sel = selected(g);
      return sel ? s + sel.option.fee + (sel.priority ? sel.option.priority!.fee : 0) : s;
    }, 0) ?? null;
  const choose = (vendorId: string, change: { method?: string; priority?: boolean }) =>
    setChoices((prev) => ({ ...prev, [vendorId]: { method: prev[vendorId]?.method, priority: prev[vendorId]?.priority ?? false, ...change } }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const optional = (v?: string) => (v?.trim() ? v.trim() : undefined);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          phone: optional(form.phone),
          address1: form.address1,
          address2: optional(form.address2),
          city: form.city,
          state: form.state,
          zip,
          giftMessage: optional(form.giftMessage),
          items,
          selections: (quotes ?? []).flatMap((g) => {
            const sel = selected(g);
            return sel ? [{ vendorId: g.vendorId, method: sel.option.method, priority: sel.priority }] : [];
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong placing your order.");
      // The cart is cleared on the order page once payment is confirmed.
      window.location.assign(data.redirectUrl);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-semibold">Contact</legend>
          <input name="email" type="email" required placeholder="Email" className={input} />
          <input name="phone" type="tel" placeholder="Phone (for delivery updates)" className={input} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-semibold">Ship to</legend>
          <input name="name" required placeholder="Recipient's full name" className={input} />
          <input name="address1" required placeholder="Street address" className={input} />
          <input name="address2" placeholder="Apt, suite, etc. (optional)" className={input} />
          <div className="grid grid-cols-[1fr_90px_120px] gap-3">
            <input name="city" required placeholder="City" className={input} />
            <select name="state" required defaultValue="" className={input}>
              <option value="" disabled>State</option>
              {US_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input
              name="zip"
              required
              inputMode="numeric"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className={input}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-lg font-semibold">Sending a gift?</legend>
          <textarea name="giftMessage" maxLength={300} rows={3} placeholder="Add a gift message (optional)" className={input} />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-lg font-semibold">Payment</legend>
          {stripeEnabled ? (
            <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
              🔒 You&apos;ll pay securely with Stripe on the next page. Cards, Apple Pay and Google Pay accepted.
            </p>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
              Demo mode: no card is charged. Add your Stripe keys to take real payments.
            </div>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-stone-200 bg-white p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {[...Map.groupBy(lines, (l) => l.vendorId).entries()].map(([vendorId, vendorLines]) => {
          const group = quotes?.find((g) => g.vendorId === vendorId);
          const q = group?.quote;
          const sel = group ? selected(group) : null;
          return (
            <div key={vendorId} className="border-b border-stone-100 pb-3 text-sm">
              <p className="font-medium">{vendorLines[0].vendorName}</p>
              {vendorLines.map((l) => (
                <div key={l.productId} className="flex justify-between text-stone-600">
                  <span>{l.quantity} × {l.name}</span>
                  <span>{formatMoney(l.price * l.quantity)}</span>
                </div>
              ))}
              {q && !q.available && <p className="mt-1 text-red-600">{q.reason}</p>}
              {q?.available && sel && (
                <>
                  <div className="mt-2 space-y-1">
                    {q.options.map((o) => (
                      <label key={o.method} className="flex items-start gap-2 text-emerald-800">
                        <input
                          type="radio"
                          className="mt-1"
                          name={`delivery-${vendorId}`}
                          checked={sel.option.method === o.method}
                          onChange={() => choose(vendorId, { method: o.method })}
                        />
                        <span>
                          {methodLabel(o.method)} · arrives {formatDeliveryDate(o.deliveryDate)} · {o.fee === 0 ? "Free" : formatMoney(o.fee)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {sel.option.priority ? (
                    <label className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={sel.priority}
                        onChange={(e) => choose(vendorId, { method: sel.option.method, priority: e.target.checked })}
                      />
                      <span>
                        <strong>Priority delivery before {q.holiday?.name}</strong> +{formatMoney(sel.option.priority.fee)}
                        <br />
                        Packed first and guaranteed by {formatDeliveryDate(sel.option.priority.deliveryDate)}
                        {sel.option.priority.deliveryDate < sel.option.deliveryDate && " (same day)"}.
                      </span>
                    </label>
                  ) : (
                    q.holiday && <p className="mt-1 text-amber-700">Arrives after {q.holiday.name} begins.</p>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between">
            <span>Shipping & delivery</span>
            <span>{shipping == null ? "Enter ZIP" : shipping === 0 ? "Free" : formatMoney(shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(subtotal + (shipping ?? 0))}</span>
          </div>
        </div>
        {cancelled && !error && <p className="text-sm text-amber-700">Payment was cancelled. Your cart is still here.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={submitting || !quotes || blocked.length > 0}
          className="w-full rounded-full bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Placing order…" : stripeEnabled ? "Continue to payment" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
