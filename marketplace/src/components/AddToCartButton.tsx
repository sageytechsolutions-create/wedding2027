"use client";

import { useState } from "react";
import { useCart, type CartLine } from "./cart";

export function AddToCartButton({ product, withQuantity = false }: { product: Omit<CartLine, "quantity">; withQuantity?: boolean }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {withQuantity && (
        <select
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2"
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
        className="rounded-lg bg-brand px-5 py-2 font-medium text-white transition hover:bg-brand-dark"
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
    </div>
  );
}
