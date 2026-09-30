import { site } from "./config";

// Calendar days are represented as UTC-midnight Dates so arithmetic ignores DST.
export function toDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: Date, n: number): Date {
  return new Date(day.getTime() + n * 86_400_000);
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
