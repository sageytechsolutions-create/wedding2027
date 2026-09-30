// Link to the carrier's tracking page, when we recognize the carrier.
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!trackingNumber) return null;
  const n = encodeURIComponent(trackingNumber.trim());
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("ups") || /^1Z/i.test(trackingNumber)) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
  return null;
}
