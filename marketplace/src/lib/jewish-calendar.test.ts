import { describe, expect, it } from "vitest";
import { reopenTime, storeStatus, upcomingHoliday, yomTovName } from "./jewish-calendar";

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

describe("reopenTime", () => {
  it("is one hour after New York sunset", () => {
    // NYC sunset Sat Nov 7 2026 is about 4:43pm EST (21:43Z).
    const t = reopenTime(day("2026-11-07"));
    expect(t.toISOString() > "2026-11-07T22:40:00Z" && t.toISOString() < "2026-11-07T22:47:00Z").toBe(true);
    // Summer: sunset about 8:31pm EDT on Sat Jun 26 2027 -> reopen about 9:31pm (01:31Z next day).
    const summer = reopenTime(day("2027-06-26"));
    expect(summer.toISOString() > "2027-06-27T01:28:00Z" && summer.toISOString() < "2027-06-27T01:35:00Z").toBe(true);
  });
});

describe("storeStatus", () => {
  // EST (UTC-5) in November.
  const est = (date: string, time: string) => new Date(`${date}T${time}:00-05:00`);

  it("warns before closing on Friday", () => {
    expect(storeStatus(est("2026-11-06", "13:00"))).toEqual({ open: true, closesToday: { at: "2:00 PM ET", reason: "Shabbat" } });
  });

  it("closes Friday at 2pm until an hour after sunset Motzei Shabbat", () => {
    const closed = storeStatus(est("2026-11-06", "14:00"));
    expect(closed).toMatchObject({ open: false, reason: "Shabbat" });
    expect(!closed.open && closed.reopens).toMatch(/^Saturday, November 7 at 5:4\d PM ET$/);

    const reopen = reopenTime(day("2026-11-07"));
    expect(storeStatus(new Date(reopen.getTime() - 60_000))).toMatchObject({ open: false, reopens: expect.stringMatching(/^tonight at 5:4\d PM ET$/) });
    expect(storeStatus(reopen)).toEqual({ open: true, closesToday: null });
  });

  it("stays closed across Yom Tov that follows Shabbat", () => {
    const closed = storeStatus(new Date("2026-10-02T15:00:00-04:00"));
    expect(closed).toMatchObject({ open: false, reason: "Shemini Atzeres & Simchas Torah" });
    expect(!closed.open && closed.reopens).toMatch(/^Sunday, October 4 at 7:\d\d PM ET$/);
    expect(storeStatus(new Date("2026-10-03T23:00:00-04:00"))).toMatchObject({ open: false });
  });

  it("closes for Yom Kippur", () => {
    expect(storeStatus(new Date("2026-09-20T15:00:00-04:00"))).toMatchObject({ open: false, reason: "Yom Kippur" });
    expect(storeStatus(est("2026-11-10", "15:00"))).toEqual({ open: true, closesToday: null });
  });
});
