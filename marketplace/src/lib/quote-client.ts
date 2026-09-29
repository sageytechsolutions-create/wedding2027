import type { FulfillmentQuote } from "./fulfillment";

export interface GroupQuote {
  vendorId: string;
  vendorName: string;
  subtotal: number;
  quote: FulfillmentQuote;
}

export async function fetchQuote(zip: string, items: { productId: string; quantity: number }[]) {
  const res = await fetch("/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ zip, items }),
  });
  if (!res.ok) throw new Error("Couldn't get a delivery estimate.");
  return (await res.json()) as { groups: GroupQuote[]; missing: string[] };
}
