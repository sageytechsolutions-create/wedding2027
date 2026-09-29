import { describe, expect, it } from "vitest";
import { storeStatus, upcomingHoliday, yomTovName } from "./jewish-calendar";

const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe("yomTovName", () => {
  it("knows diaspora Yom Tov days", () => {
    expect(yomTovName(day("2026-09-21"))).toBe("Yom Kippur");
    expect(yomTovName(day("2027-04-23"))).toBe("Pesach");
    expect(yomTovName(day("2027-04-25"))).toBeNull(); // Chol Hamoed
  });
});

describe("upcomingHoliday", () => {
  it("finds the next Yom Tov within two weeks", () => {
    expect(upcomingHoliday(day("2026-09-29"))).toEqual({ name: "Shemini Atzeres", firstDay: "2026-10-03", erev: "2026-10-02" });
    expect(upcomingHoliday(day("2026-11-03"))).toBeNull();
  });
});

describe("storeStatus", () => {
  it("warns before closing on Friday", () => {
    expect(storeStatus(day("2026-11-06"), 13)).toEqual({ open: true, closesToday: { at: "2:00 PM ET", reason: "Shabbat" } });
  });

  it("closes Friday at 2pm until Motzei Shabbat", () => {
    expect(storeStatus(day("2026-11-06"), 14)).toMatchObject({ open: false, reason: "Shabbat", reopens: "Saturday, November 7 night at 10:00 PM ET" });
    expect(storeStatus(day("2026-11-07"), 21)).toMatchObject({ open: false, reopens: "Tonight at 10:00 PM ET" });
    expect(storeStatus(day("2026-11-07"), 22)).toEqual({ open: true, closesToday: null });
  });

  it("stays closed across Yom Tov that follows Shabbat", () => {
    expect(storeStatus(day("2026-10-02"), 15)).toMatchObject({
      open: false,
      reason: "Shemini Atzeres & Simchas Torah",
      reopens: "Sunday, October 4 night at 10:00 PM ET",
    });
    expect(storeStatus(day("2026-10-03"), 23)).toMatchObject({ open: false });
  });

  it("closes for Yom Kippur", () => {
    expect(storeStatus(day("2026-09-20"), 15)).toMatchObject({ open: false, reason: "Yom Kippur" });
    expect(storeStatus(day("2026-11-10"), 15)).toEqual({ open: true, closesToday: null });
  });
});
