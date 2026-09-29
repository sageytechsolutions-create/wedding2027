import { site } from "./config";
import { isRestDay, upcomingHoliday } from "./jewish-calendar";

// Decides how a vendor's items reach a customer and when they arrive.
//
// - Local delivery: the customer's ZIP is in the vendor's delivery area.
//   The vendor drives it over the next day (never on Shabbat or Yom Tov).
// - Overnight shipping: everyone else in the US. Perishable boxes only ship
//   Mon–Thu, and never the day before Yom Tov, so they never sit in a
//   carrier warehouse.

export type FulfillmentMethod = "local_delivery" | "overnight_shipping";

export interface VendorShippingRules {
  localZipPrefixes: string; // comma-separated 3-digit prefixes
  localDeliveryFee: number;
  shipsNationwide: boolean;
  overnightShipFee: number;
  freeShippingMin: number | null;
  priorityFee: number;
}

// Offered in the two weeks before Yom Tov: guaranteed to arrive before the holiday.
export interface PriorityOption {
  fee: number;
  holidayName: string;
  shipDate: string;
  deliveryDate: string;
}

export type FulfillmentQuote =
  | {
      available: true;
      method: FulfillmentMethod;
      fee: number;
      shipDate: string; // YYYY-MM-DD
      deliveryDate: string; // YYYY-MM-DD
      holiday?: { name: string; firstDay: string; arrivesBefore: boolean };
      priority?: PriorityOption;
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

// 0 = Sunday … 6 = Saturday. Rest days (Shabbat and Yom Tov) are excluded on top of these.
const PERISHABLE_SHIP_DAYS = new Set([1, 2, 3, 4]);
const STANDARD_SHIP_DAYS = new Set([1, 2, 3, 4, 5]);
const CARRIER_DELIVERY_DAYS = new Set([1, 2, 3, 4, 5]);

function firstDay(from: Date, ok: (day: Date) => boolean): Date {
  let day = from;
  for (let i = 0; i < 60 && !ok(day); i++) day = addDays(day, 1);
  return day;
}

const workDay = (day: Date) => !isRestDay(day);
const carrierDeliveryDay = (day: Date) => CARRIER_DELIVERY_DAYS.has(day.getUTCDay()) && workDay(day);

export function quoteFulfillment(
  rules: VendorShippingRules,
  zip: string,
  subtotal: number,
  perishable: boolean,
  now: Date = new Date(),
): FulfillmentQuote {
  if (!isValidZip(zip)) return { available: false, reason: "Enter a valid 5-digit ZIP code." };

  const { day: today, hour } = localNow(now);
  // Past the cutoff, the vendor can't prepare it today. Nothing is prepared on Shabbat or Yom Tov.
  const prepDay = firstDay(hour < site.orderCutoffHour ? today : addDays(today, 1), workDay);
  const free = rules.freeShippingMin != null && subtotal >= rules.freeShippingMin;
  const holiday = upcomingHoliday(today);
  const beforeHoliday = (day: Date) => holiday != null && formatDay(day) < holiday.firstDay;

  let method: FulfillmentMethod;
  let fee: number;
  let shipDate: Date;
  let deliveryDate: Date;
  let priority: PriorityOption | undefined;

  if (isLocalZip(rules, zip)) {
    method = "local_delivery";
    fee = free ? 0 : rules.localDeliveryFee;
    // The vendor drives it out the same day it's delivered.
    deliveryDate = firstDay(addDays(prepDay, 1), workDay);
    shipDate = deliveryDate;
    if (holiday) {
      // Priority: same-day delivery when the order is in before the cutoff.
      const rush = formatDay(prepDay) === formatDay(today) ? today : deliveryDate;
      if (beforeHoliday(rush)) {
        priority = { fee: rules.priorityFee, holidayName: holiday.name, shipDate: formatDay(rush), deliveryDate: formatDay(rush) };
      }
    }
  } else {
    if (!rules.shipsNationwide) {
      return { available: false, reason: "This vendor only delivers locally and doesn't reach your ZIP yet." };
    }
    method = "overnight_shipping";
    fee = free ? 0 : rules.overnightShipFee;
    const shipDays = perishable ? PERISHABLE_SHIP_DAYS : STANDARD_SHIP_DAYS;
    // Perishables must arrive the very next day, so the day after shipping has to be a delivery day too.
    shipDate = firstDay(
      prepDay,
      (d) => shipDays.has(d.getUTCDay()) && workDay(d) && (!perishable || carrierDeliveryDay(addDays(d, 1))),
    );
    deliveryDate = firstDay(addDays(shipDate, 1), carrierDeliveryDay);
    if (holiday && beforeHoliday(deliveryDate)) {
      // Priority: packed first and guaranteed to arrive before Yom Tov.
      priority = { fee: rules.priorityFee, holidayName: holiday.name, shipDate: formatDay(shipDate), deliveryDate: formatDay(deliveryDate) };
    }
  }

  return {
    available: true,
    method,
    fee,
    shipDate: formatDay(shipDate),
    deliveryDate: formatDay(deliveryDate),
    holiday: holiday ? { name: holiday.name, firstDay: holiday.firstDay, arrivesBefore: beforeHoliday(deliveryDate) } : undefined,
    priority,
  };
}

export function methodLabel(method: string): string {
  return method === "local_delivery" ? "Local next-day delivery" : "Overnight shipping";
}

export function formatDeliveryDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
