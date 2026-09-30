"use client";

import Link from "next/link";
import { useCart, type CartLine } from "@/components/cart";
import { formatMoney } from "@/lib/money";

function Thumb({ line }: { line: CartLine }) {
  return (
    <Link href={`/products/${line.slug}`} className="block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
      {line.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={line.photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>{line.emoji}</span>
      )}
    </Link>
  );
}

export default function CartPage() {
  const { lines, ready, subtotal, count, setQuantity, remove } = useCart();
  if (!ready) return null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="text-6xl" aria-hidden>🛒</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-stone-600">Iconic kosher food from local legends is a few clicks away.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-stone-900 px-7 py-3.5 font-semibold text-white hover:bg-stone-700">Start shopping</Link>
      </div>
    );
  }

  const byVendor = Map.groupBy(lines, (l) => l.vendorName);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your cart</h1>
      <p className="mt-1 text-stone-500">{count} item{count === 1 ? "" : "s"} · each shop sends its part fresh from its own kitchen</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {[...byVendor.entries()].map(([vendorName, vendorLines]) => (
            <section key={vendorName}>
              <h2 className="border-b border-stone-200 pb-2 text-sm font-bold uppercase tracking-wide">Ships from {vendorName}</h2>
              <ul className="divide-y divide-stone-100">
                {vendorLines.map((l) => (
                  <li key={l.productId} className="flex gap-4 py-5">
                    <Thumb line={l} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/products/${l.slug}`} className="font-semibold leading-snug hover:underline">{l.name}</Link>
                        <span className="shrink-0 font-bold">{formatMoney(l.price * l.quantity)}</span>
                      </div>
                      <p className="text-sm text-stone-500">{formatMoney(l.price)} each</p>
                      <div className="mt-auto flex items-center gap-4 pt-3 text-sm">
                        <select
                          aria-label={`Quantity of ${l.name}`}
                          value={l.quantity}
                          onChange={(e) => setQuantity(l.productId, Number(e.target.value))}
                          className="rounded-full border border-stone-300 bg-white px-3 py-1.5 font-medium"
                        >
                          {Array.from({ length: Math.max(10, l.quantity) }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                        </select>
                        <button onClick={() => remove(l.productId)} className="text-stone-500 underline underline-offset-2 hover:text-red-600" aria-label={`Remove ${l.name}`}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="h-fit rounded-2xl bg-stone-50 p-6 lg:sticky lg:top-36">
          <h2 className="text-lg font-bold">Order summary</h2>
          <div className="mt-4 flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <p className="mt-1 text-sm text-stone-500">Delivery options, fees and dates are shown at checkout once you enter a ZIP code.</p>
          <Link href="/checkout" className="mt-6 block rounded-full bg-stone-900 py-3.5 text-center font-semibold text-white hover:bg-stone-700">Checkout</Link>
          <ul className="mt-6 space-y-1.5 text-sm text-stone-600">
            <li>✡️ Every shop certified kosher</li>
            <li>📅 Pick your delivery day at checkout</li>
            <li>🔒 Secure payment by Stripe</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
