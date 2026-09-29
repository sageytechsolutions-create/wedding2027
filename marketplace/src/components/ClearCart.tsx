"use client";

import { useEffect } from "react";
import { useCart } from "./cart";

export function ClearCart() {
  const { ready, clear } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
