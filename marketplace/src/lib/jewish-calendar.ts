import { HebrewCalendar, Location, Zmanim, flags } from "@hebcal/core";
import { site } from "./config";
import { addDays, formatDay, localNow } from "./time";

// Shabbat and Yom Tov (diaspora, two-day chagim) awareness.
// Calendar days are UTC-midnight Dates, matching fulfillment.ts.

const HOLIDAY_NAMES: [prefix: string, name: string][] = [
  ["Rosh Hashana", "Rosh Hashanah"],
  ["Yom Kippur", "Yom Kippur"],
  ["Sukkot", "Sukkos"],
  ["Shmini Atzeret", "Shemini Atzeres"],
  ["Simchat Torah", "Simchas Torah"],
  ["Pesach", "Pesach"],
  ["Shavuot", "Shavuos"],
];

function displayName(desc: string): string {
  return HOLIDAY_NAMES.find(([prefix]) => desc.startsWith(prefix))?.[1] ?? desc;
}

const yomTovByYear = new Map<number, Map<string, string>>();

// YYYY-MM-DD -> holiday name, for every Yom Tov day (work prohibited) in the year.
function yomTovDays(year: number): Map<string, string> {
  let days = yomTovByYear.get(year);
  if (!days) {
    days = new Map();
    const events = HebrewCalendar.calendar({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      il: false,
      noMinorFast: true,
      noModern: true,
      noRoshChodesh: true,
      noSpecialShabbat: true,
    });
    for (const ev of events) {
      if (!(ev.getFlags() & flags.CHAG)) continue;
      const g = ev.getDate().greg();
      const key = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`;
      days.set(key, displayName(ev.getDesc()));
    }
    yomTovByYear.set(year, days);
  }
  return days;
}

const key = formatDay;

export function yomTovName(day: Date): string | null {
  return yomTovDays(day.getUTCFullYear()).get(key(day)) ?? null;
}

export function isShabbat(day: Date): boolean {
  return day.getUTCDay() === 6;
}

// A day when the business is closed and nothing is delivered.
export function isRestDay(day: Date): boolean {
  return isShabbat(day) || yomTovName(day) !== null;
}

// Name for a run of consecutive rest days, e.g. "Shabbat", "Sukkos", "Shavuos & Shabbat".
function restPeriodName(firstDay: Date): string {
  const names: string[] = [];
  for (let d = firstDay; isRestDay(d); d = addDays(d, 1)) {
    const name = yomTovName(d) ?? "Shabbat";
    if (!names.includes(name)) names.push(name);
  }
  return names.join(" & ");
}

export interface UpcomingHoliday {
  name: string;
  firstDay: string; // YYYY-MM-DD, first Yom Tov day
  erev: string; // YYYY-MM-DD, the day before
}

// The next Yom Tov that starts after `today`, if it's within `withinDays`.
export function upcomingHoliday(today: Date, withinDays = 14): UpcomingHoliday | null {
  for (let i = 1; i <= withinDays; i++) {
    const day = addDays(today, i);
    const name = yomTovName(day);
    if (name && !yomTovName(addDays(day, -1))) {
      return { name, firstDay: key(day), erev: key(addDays(day, -1)) };
    }
  }
  return null;
}

export type StoreStatus =
  | { open: true; closesToday: { at: string; reason: string } | null }
  | { open: false; reason: string; reopens: string };

const sunsetLocation = Location.lookup(site.sunsetLocation);
if (!sunsetLocation) throw new Error(`Unknown sunset location: ${site.sunsetLocation}`);

// When the site reopens after the rest day `day` ends: sunset plus a margin, rounded up to the minute.
export function reopenTime(day: Date): Date {
  const sunset = new Zmanim(sunsetLocation!, new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()), false).sunset();
  const reopen = sunset.getTime() + site.reopenMinutesAfterSunset * 60_000;
  return new Date(Math.ceil(reopen / 60_000) * 60_000);
}

function timeLabel(at: Date): string {
  return `${at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: site.timeZone })} ET`;
}

function dayLabel(day: Date): string {
  return day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

function lastRestDay(from: Date): Date {
  let last = from;
  while (isRestDay(addDays(last, 1))) last = addDays(last, 1);
  return last;
}

// The store closes at `erevCloseHour` before Shabbat/Yom Tov and reopens
// `reopenMinutesAfterSunset` after sunset on the last rest day.
export function storeStatus(now: Date): StoreStatus {
  const { day: today, hour } = localNow(now);
  const tomorrow = addDays(today, 1);

  if (isRestDay(today)) {
    let first = today;
    while (isRestDay(addDays(first, -1))) first = addDays(first, -1);
    const last = lastRestDay(today);
    const reopens = reopenTime(last);
    if (now < reopens) {
      const when = key(last) === key(today) ? "tonight" : `${dayLabel(last)}`;
      return { open: false, reason: restPeriodName(first), reopens: `${when} at ${timeLabel(reopens)}` };
    }
    return { open: true, closesToday: null }; // Motzei Shabbat / Yom Tov
  }

  if (isRestDay(tomorrow)) {
    const reason = restPeriodName(tomorrow);
    if (hour >= site.erevCloseHour) {
      const last = lastRestDay(tomorrow);
      return { open: false, reason, reopens: `${dayLabel(last)} at ${timeLabel(reopenTime(last))}` };
    }
    const closeAt = site.erevCloseHour % 12 || 12;
    return { open: true, closesToday: { at: `${closeAt}:00 ${site.erevCloseHour < 12 ? "AM" : "PM"} ET`, reason } };
  }

  return { open: true, closesToday: null };
}
