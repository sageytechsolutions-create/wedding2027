import { describe, expect, it } from "vitest";
import { isLocalZip, quoteFulfillment, type VendorShippingRules } from "./fulfillment";

const nycVendor: VendorShippingRules = {
  localZipPrefixes: "100, 101,112",
  localDeliveryFee: 999,
  shipsNationwide: true,
  overnightShipFee: 1999,
  freeShippingMin: 15000,
  priorityFee: 1499,
};

// 9–10am and 3–4pm New York time on the given date (EDT before Nov 1 2026, EST after).
const morning = (date: string) => new Date(`${date}T14:00:00Z`);
const evening = (date: string) => new Date(`${date}T20:00:00Z`);
const LOCAL = "11230";
const FAR = "90210";

describe("isLocalZip", () => {
  it("matches on the 3-digit ZIP prefix", () => {
    expect(isLocalZip(nycVendor, "10012")).toBe(true);
    expect(isLocalZip(nycVendor, "11201")).toBe(true);
    expect(isLocalZip(nycVendor, "90210")).toBe(false);
  });
});

// November 2026 has no Yom Tov, so these only exercise weekday and Shabbat rules.
describe("quoteFulfillment on ordinary weeks", () => {
  it("rejects malformed ZIPs", () => {
    expect(quoteFulfillment(nycVendor, "1234", 5000, true).available).toBe(false);
  });

  it("delivers locally the next day when ordered before cutoff", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, morning("2026-11-03"));
    expect(q).toMatchObject({ available: true, method: "local_delivery", fee: 999, deliveryDate: "2026-11-04" });
    expect(q.available && q.priority).toBeUndefined();
  });

  it("pushes local delivery a day when ordered after cutoff", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, evening("2026-11-03"));
    expect(q).toMatchObject({ deliveryDate: "2026-11-05" });
  });

  it("never delivers locally on Shabbat", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, morning("2026-11-06"));
    expect(q).toMatchObject({ deliveryDate: "2026-11-08" });
  });

  it("prepares Motzei Shabbat orders on Sunday", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, new Date("2026-11-08T03:30:00Z")); // Sat 10:30pm EST
    expect(q).toMatchObject({ deliveryDate: "2026-11-09" });
  });

  it("ships overnight nationwide and arrives next day", () => {
    const q = quoteFulfillment(nycVendor, FAR, 5000, true, morning("2026-11-03"));
    expect(q).toMatchObject({ method: "overnight_shipping", fee: 1999, shipDate: "2026-11-03", deliveryDate: "2026-11-04" });
  });

  it("holds perishable boxes placed Friday until Monday", () => {
    const q = quoteFulfillment(nycVendor, FAR, 5000, true, morning("2026-11-06"));
    expect(q).toMatchObject({ shipDate: "2026-11-09", deliveryDate: "2026-11-10" });
  });

  it("lets non-perishables ship Friday for Monday delivery", () => {
    const q = quoteFulfillment(nycVendor, FAR, 5000, false, morning("2026-11-06"));
    expect(q).toMatchObject({ shipDate: "2026-11-06", deliveryDate: "2026-11-09" });
  });

  it("waives the fee above the free-shipping minimum", () => {
    const q = quoteFulfillment(nycVendor, FAR, 15000, true, morning("2026-11-03"));
    expect(q).toMatchObject({ fee: 0 });
  });

  it("is unavailable outside the area for local-only vendors", () => {
    const q = quoteFulfillment({ ...nycVendor, shipsNationwide: false }, FAR, 5000, true);
    expect(q.available).toBe(false);
  });
});

// Shemini Atzeres / Simchas Torah: Sat Oct 3 – Sun Oct 4, 2026.
describe("quoteFulfillment around Yom Tov", () => {
  it("offers same-day priority delivery locally before Yom Tov", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, morning("2026-09-29"));
    expect(q).toMatchObject({
      deliveryDate: "2026-09-30",
      holiday: { name: "Shemini Atzeres", firstDay: "2026-10-03", arrivesBefore: true },
      priority: { fee: 1499, deliveryDate: "2026-09-29", holidayName: "Shemini Atzeres" },
    });
  });

  it("skips Shabbat and Yom Tov for local delivery", () => {
    const q = quoteFulfillment(nycVendor, LOCAL, 5000, true, morning("2026-10-02"));
    expect(q).toMatchObject({ deliveryDate: "2026-10-05", holiday: { arrivesBefore: false } });
    expect(q.available && q.priority?.deliveryDate).toBe("2026-10-02");
  });

  it("offers guaranteed priority shipping when it arrives before Yom Tov", () => {
    const q = quoteFulfillment(nycVendor, FAR, 5000, true, morning("2026-10-01"));
    expect(q).toMatchObject({ shipDate: "2026-10-01", deliveryDate: "2026-10-02", priority: { deliveryDate: "2026-10-02" } });
  });

  it("never ships perishables into Yom Tov (Pesach 2027)", () => {
    // Wed Apr 21 2027 is Erev Pesach; Thu–Fri are Yom Tov, then Shabbat.
    const q = quoteFulfillment(nycVendor, FAR, 5000, true, morning("2027-04-21"));
    expect(q).toMatchObject({ shipDate: "2027-04-26", deliveryDate: "2027-04-27", holiday: { name: "Pesach", arrivesBefore: false } });
    expect(q.available && q.priority).toBeUndefined();
  });
});
