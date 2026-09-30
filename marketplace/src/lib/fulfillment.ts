import { localDelivery, site } from "./config";
import { isRestDay, upcomingHoliday } from "./jewish-calendar";
import { addDays, formatDay, localNow } from "./time";

export { formatDay, localNow };
// Display helpers live in format.ts so browser code can use them without the holiday calendar.
export { formatDeliveryDate, methodLabel } from "./format";

// Decides how a vendor's items can reach a customer and when they arrive.
//
// - Local delivery: the customer's ZIP is in the shared courier's area and the
//   courier picks up from this vendor. Delivered the next day (never on
//   Shabbat or Yom Tov).
// - Overnight shipping: everyone else in the US. Perishable boxes only ship
//   Mon–Thu, and never the day before Yom Tov, so they never sit in a
//   carrier warehouse.
// - 2-day shipping: a cheaper option for shelf-stable orders.

export type FulfillmentMethod = "local_delivery" | "overnight_shipping" | "two_day_shipping";

export interface VendorShippingRules {
  courierPickup: boolean;
  shipsNationwide: boolean;
  overnightShipFee: number;
  twoDayShipFee: number | null; // null = 2-day shipping not offered
  freeShippingMin: number | null;
  priorityOvernightFee: number;
  priorityTwoDayFee: number;
}

// Offered in the two weeks before Yom Tov: guaranteed to arrive before the holiday.
export interface PriorityOption {
  fee: number;
  shipDate: string;
  deliveryDate: string;
}

export interface DeliveryOption {
  method: FulfillmentMethod;
  fee: number;
  shipDate: string; // YYYY-MM-DD; for local delivery, the day it goes out
  deliveryDate: string; // YYYY-MM-DD
  priority?: PriorityOption;
}

export type FulfillmentQuote =
  | {
      available: true;
      // Fastest first; the first one is the default choice.
      options: DeliveryOption[];
      holiday?: { name: string; firstDay: string };
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

export function isInCourierArea(zip: string): boolean {
  return parseZipPrefixes(localDelivery.zipPrefixes).includes(zip.slice(0, 3));
}

// 0 = Sunday … 6 = Saturday. Rest days (Shabbat and Yom Tov) are excluded on top of these.
const PERISHABLE_SHIP_DAYS = new Set([1, 2, 3, 4]);
const STANDARD_SHIP_DAYS = new Set([1, 2, 3, 4, 5]);
const isBusinessDay = (day: Date) => day.getUTCDay() >= 1 && day.getUTCDay() <= 5;

function firstDay(from: Date, ok: (day: Date) => boolean): Date {
  let day = from;
  for (let i = 0; i < 60 && !ok(day); i++) day = addDays(day, 1);
  return day;
}

const workDay = (day: Date) => !isRestDay(day);

// Carriers deliver on business days, including Yom Tov, so the arrival day is
// simply the Nth business day after shipping.
function carrierArrival(shipDate: Date, transitDays: number): Date {
  let day = shipDate;
  for (let i = 0; i < transitDays; i++) day = firstDay(addDays(day, 1), isBusinessDay);
  return day;
}

function shippingOption(
  method: FulfillmentMethod,
  transitDays: number,
  fee: number,
  prepDay: Date,
  perishable: boolean,
): DeliveryOption {
  const shipDays = perishable ? PERISHABLE_SHIP_DAYS : STANDARD_SHIP_DAYS;
  // Never ship so it lands on Shabbat/Yom Tov. Perishables must also arrive the very next calendar day.
  const shipDate = firstDay(prepDay, (d) => {
    if (!shipDays.has(d.getUTCDay()) || !workDay(d)) return false;
    const arrival = carrierArrival(d, transitDays);
    return workDay(arrival) && (!perishable || formatDay(arrival) === formatDay(addDays(d, transitDays)));
  });
  return { method, fee, shipDate: formatDay(shipDate), deliveryDate: formatDay(carrierArrival(shipDate, transitDays)) };
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
  // Past the cutoff, the vendor can't prepare it today. Nothing is prepared on Shabbat or Yom Tov.
  const prepDay = firstDay(hour < site.orderCutoffHour ? today : addDays(today, 1), workDay);
  const free = rules.freeShippingMin != null && subtotal >= rules.freeShippingMin;
  const holiday = upcomingHoliday(today);
  const beforeHoliday = (day: string) => holiday != null && day < holiday.firstDay;

  const options: DeliveryOption[] = [];
  if (rules.courierPickup && isInCourierArea(zip)) {
    const deliveryDate = formatDay(firstDay(addDays(prepDay, 1), workDay));
    const option: DeliveryOption = {
      method: "local_delivery",
      fee: free ? 0 : localDelivery.fee,
      shipDate: deliveryDate,
      deliveryDate,
    };
    // Priority: same-day delivery when the order is in before the cutoff.
    const rush = formatDay(prepDay) === formatDay(today) ? formatDay(today) : deliveryDate;
    if (beforeHoliday(rush)) option.priority = { fee: localDelivery.priorityFee, shipDate: rush, deliveryDate: rush };
    options.push(option);
  } else if (rules.shipsNationwide) {
    const overnight = shippingOption("overnight_shipping", 1, free ? 0 : rules.overnightShipFee, prepDay, perishable);
    options.push({ ...overnight, ...(beforeHoliday(overnight.deliveryDate) && { priority: { fee: rules.priorityOvernightFee, shipDate: overnight.shipDate, deliveryDate: overnight.deliveryDate } }) });
    if (rules.twoDayShipFee != null && !perishable) {
      const twoDay = shippingOption("two_day_shipping", 2, free ? 0 : rules.twoDayShipFee, prepDay, perishable);
      options.push({ ...twoDay, ...(beforeHoliday(twoDay.deliveryDate) && { priority: { fee: rules.priorityTwoDayFee, shipDate: twoDay.shipDate, deliveryDate: twoDay.deliveryDate } }) });
    }
  } else {
    return { available: false, reason: "This vendor only delivers locally and doesn't reach your ZIP yet." };
  }

  return {
    available: true,
    options,
    holiday: holiday ? { name: holiday.name, firstDay: holiday.firstDay } : undefined,
  };
}
