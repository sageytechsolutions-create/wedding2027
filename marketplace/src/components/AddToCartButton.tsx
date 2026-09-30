"use client";

import { useState } from "react";
import { useCart, type CartLine } from "./cart";

export function AddToCartButton({ product, withQuantity = false }: { product: Omit<CartLine, "quantity">; withQuantity?: boolean }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-stretch gap-3">
      {withQuantity && (
        <select
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-full border border-stone-300 bg-white px-4 py-3 font-medium"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => {
          add(product, quantity);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        className="flex-1 rounded-full bg-stone-900 px-6 py-3.5 font-semibold text-white transition hover:bg-stone-700"
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
    </div>
  );
}
