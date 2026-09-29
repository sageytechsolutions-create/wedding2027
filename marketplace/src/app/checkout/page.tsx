"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import { formatDeliveryDate, methodLabel } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";
import { fetchQuote, type GroupQuote } from "@/lib/quote-client";

const US_STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, ready, subtotal, clear } = useCart();
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
  const shipping = quotes?.reduce((s, g) => s + (g.quote.available ? g.quote.fee : 0), 0) ?? null;

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong placing your order.");
      clear();
      router.push(`/orders/${data.number}?email=${encodeURIComponent(form.email)}`);
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
          <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
            Demo mode: no card is charged. Payments are the next integration to add.
          </div>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-stone-200 bg-white p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {[...Map.groupBy(lines, (l) => l.vendorId).entries()].map(([vendorId, vendorLines]) => {
          const q = quotes?.find((g) => g.vendorId === vendorId)?.quote;
          return (
            <div key={vendorId} className="border-b border-stone-100 pb-3 text-sm">
              <p className="font-medium">{vendorLines[0].vendorName}</p>
              {vendorLines.map((l) => (
                <div key={l.productId} className="flex justify-between text-stone-600">
                  <span>{l.quantity} × {l.name}</span>
                  <span>{formatMoney(l.price * l.quantity)}</span>
                </div>
              ))}
              {q &&
                (q.available ? (
                  <p className="mt-1 text-emerald-700">
                    {methodLabel(q.method)} · arrives {formatDeliveryDate(q.deliveryDate)} · {q.fee === 0 ? "Free" : formatMoney(q.fee)}
                  </p>
                ) : (
                  <p className="mt-1 text-red-600">{q.reason}</p>
                ))}
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={submitting || !quotes || blocked.length > 0}
          className="w-full rounded-full bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
