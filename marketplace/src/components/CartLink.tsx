"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
      Cart
      {count > 0 && (
        <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs">{count}</span>
      )}
    </Link>
  );
}
