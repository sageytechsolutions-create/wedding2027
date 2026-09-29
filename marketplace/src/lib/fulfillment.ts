import { site } from "./config";

// Decides how a vendor's items reach a customer and when they arrive.
//
// - Local delivery: the customer's ZIP is in the vendor's delivery area.
//   The vendor drives it over the next day (Sun–Fri; never on Shabbat).
// - Overnight shipping: everyone else in the US. Perishable boxes only ship
//   Mon–Thu so they never sit in a carrier warehouse over the weekend.

export type FulfillmentMethod = "local_delivery" | "overnight_shipping";

export interface VendorShippingRules {
  localZipPrefixes: string; // comma-separated 3-digit prefixes
  localDeliveryFee: number;
  shipsNationwide: boolean;
  overnightShipFee: number;
  freeShippingMin: number | null;
}

export type FulfillmentQuote =
  | {
      available: true;
      method: FulfillmentMethod;
      fee: number;
      shipDate: string; // YYYY-MM-DD
      deliveryDate: string; // YYYY-MM-DD
    }
  | { available: false; reason: string };

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export function parseZipPrefixes(prefixes: string): string[] {
  return prefixes
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /^\d{3}$/.test(p));
}

export function isLocalZip(rules: Pick<VendorShippingRules, "localZipPrefixes">, zip: string): boolean {
  return parseZipPrefixes(rules.localZipPrefixes).includes(zip.slice(0, 3));
}

// Calendar days are represented as UTC-midnight Dates so arithmetic ignores DST.
function toDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(day: Date, n: number): Date {
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

export function formatDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

// The calendar day and hour "now" in the platform's time zone.
export function localNow(now: Date, timeZone = site.timeZone): { day: Date; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: toDay(Number(parts.year), Number(parts.month), Number(parts.day)),
    hour: Number(parts.hour),
  };
}

// 0 = Sunday … 6 = Saturday
// No deliveries on Shabbat. Carriers already skip Saturday via CARRIER_DELIVERY_DAYS.
const LOCAL_DELIVERY_DAYS = new Set([0, 1, 2, 3, 4, 5]);
const PERISHABLE_SHIP_DAYS = new Set([1, 2, 3, 4]);
const STANDARD_SHIP_DAYS = new Set([1, 2, 3, 4, 5]);
const CARRIER_DELIVERY_DAYS = new Set([1, 2, 3, 4, 5]);

function nextDayIn(from: Date, allowed: Set<number>): Date {
  let day = from;
  while (!allowed.has(day.getUTCDay())) day = addDays(day, 1);
  return day;
}

export function quoteFulfillment(
  rules: VendorShippingRules,
  zip: string,
  subtotal: number,
  perishable: boolean,
  now: Date = new Date(),
): FulfillmentQuote {
  if (!isValidZip(zip)) return { available: false, reason: "Enter a valid 5-digit ZIP code." };

  const { day: today, hour } = localNow(now);
  // Past the cutoff, the vendor can't prepare it today, so the earliest it can leave is tomorrow.
  const earliestPrepDay = hour < site.orderCutoffHour ? today : addDays(today, 1);
  const free = rules.freeShippingMin != null && subtotal >= rules.freeShippingMin;

  if (isLocalZip(rules, zip)) {
    const deliveryDate = nextDayIn(addDays(earliestPrepDay, 1), LOCAL_DELIVERY_DAYS);
    return {
      available: true,
      method: "local_delivery",
      fee: free ? 0 : rules.localDeliveryFee,
      // The vendor drives it out the same day it's delivered.
      shipDate: formatDay(deliveryDate),
      deliveryDate: formatDay(deliveryDate),
    };
  }

  if (!rules.shipsNationwide) {
    return { available: false, reason: "This vendor only delivers locally and doesn't reach your ZIP yet." };
  }

  const shipDate = nextDayIn(earliestPrepDay, perishable ? PERISHABLE_SHIP_DAYS : STANDARD_SHIP_DAYS);
  const deliveryDate = nextDayIn(addDays(shipDate, 1), CARRIER_DELIVERY_DAYS);
  return {
    available: true,
    method: "overnight_shipping",
    fee: free ? 0 : rules.overnightShipFee,
    shipDate: formatDay(shipDate),
    deliveryDate: formatDay(deliveryDate),
  };
}

export function methodLabel(method: string): string {
  return method === "local_delivery" ? "Local next-day delivery" : "Overnight shipping";
}

export function formatDeliveryDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
