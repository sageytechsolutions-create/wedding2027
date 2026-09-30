export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function vendorLocation(v: { city: string; state: string }): string {
  return [v.city, v.state].filter(Boolean).join(", ");
}
