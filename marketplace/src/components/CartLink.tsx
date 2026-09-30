"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} className="relative flex items-center gap-1.5 rounded-full px-2 py-1.5 hover:text-brand">
      <span aria-hidden className="text-xl">🛒</span>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}
