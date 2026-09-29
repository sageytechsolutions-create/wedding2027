"use client";

import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { lines, ready, subtotal, setQuantity, remove } = useCart();
  if (!ready) return null;

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-white">Start shopping</Link>
      </div>
    );
  }

  const byVendor = Map.groupBy(lines, (l) => l.vendorName);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-3xl font-bold">Your cart</h1>
        <p className="mt-1 text-sm text-stone-500">Each vendor ships their items separately, straight from their kitchen.</p>
        {[...byVendor.entries()].map(([vendorName, vendorLines]) => (
          <section key={vendorName} className="mt-6 rounded-2xl border border-stone-200 bg-white">
            <h2 className="border-b border-stone-100 px-5 py-3 font-semibold">Ships from {vendorName}</h2>
            <ul className="divide-y divide-stone-100">
              {vendorLines.map((l) => (
                <li key={l.productId} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-3xl">{l.emoji}</span>
                  <div className="flex-1">
                    <Link href={`/products/${l.slug}`} className="font-medium hover:text-brand">{l.name}</Link>
                    <p className="text-sm text-stone-500">{formatMoney(l.price)}</p>
                  </div>
                  <select
                    aria-label={`Quantity of ${l.name}`}
                    value={l.quantity}
                    onChange={(e) => setQuantity(l.productId, Number(e.target.value))}
                    className="rounded-lg border border-stone-300 px-2 py-1"
                  >
                    {Array.from({ length: Math.max(10, l.quantity) }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                  </select>
                  <span className="w-20 text-right font-medium">{formatMoney(l.price * l.quantity)}</span>
                  <button onClick={() => remove(l.productId)} className="text-sm text-stone-400 hover:text-red-600" aria-label={`Remove ${l.name}`}>✕</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 lg:sticky lg:top-24">
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <p className="mt-1 text-sm text-stone-500">Shipping and delivery date calculated at checkout from your ZIP.</p>
        <Link href="/checkout" className="mt-6 block rounded-full bg-brand py-3 text-center font-medium text-white hover:bg-brand-dark">Checkout</Link>
      </aside>
    </div>
  );
}
