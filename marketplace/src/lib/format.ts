// Display helpers that are safe to use in the browser (no calendar or database imports).

export function methodLabel(method: string): string {
  switch (method) {
    case "local_delivery":
      return "Local next-day delivery";
    case "two_day_shipping":
      return "2-day shipping";
    default:
      return "Overnight shipping";
  }
}

export function formatDeliveryDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
