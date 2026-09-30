import { describe, expect, it } from "vitest";
import { isInCourierArea, quoteFulfillment, type FulfillmentQuote, type VendorShippingRules } from "./fulfillment";

const vendor: VendorShippingRules = {
  courierPickup: true,
  shipsNationwide: true,
  overnightShipFee: 1999,
  twoDayShipFee: 999,
  freeShippingMin: 15000,
  priorityOvernightFee: 1499,
  priorityTwoDayFee: 999,
};

// 9–10am and 3–4pm New York time on the given date (EDT before Nov 1 2026, EST after).
const morning = (date: string) => new Date(`${date}T14:00:00Z`);
const evening = (date: string) => new Date(`${date}T20:00:00Z`);
const LOCAL = "11230";
const FAR = "90210";

function options(q: FulfillmentQuote) {
  if (!q.available) throw new Error(q.reason);
  return q.options;
}
const option = (q: FulfillmentQuote, method: string) => options(q).find((o) => o.method === method);

describe("isInCourierArea", () => {
  it("covers the five boroughs by ZIP prefix", () => {
    expect(isInCourierArea("10065")).toBe(true);
    expect(isInCourierArea("11229")).toBe(true);
    expect(isInCourierArea("90210")).toBe(false);
  });
});

// November 2026 has no Yom Tov, so these only exercise weekday and Shabbat rules.
describe("quoteFulfillment on ordinary weeks", () => {
  it("rejects malformed ZIPs", () => {
    expect(quoteFulfillment(vendor, "1234", 5000, true).available).toBe(false);
  });

  it("delivers locally by courier the next day when ordered before cutoff", () => {
    const q = quoteFulfillment(vendor, LOCAL, 5000, true, morning("2026-11-03"));
    expect(options(q)).toEqual([{ method: "local_delivery", fee: 999, shipDate: "2026-11-04", deliveryDate: "2026-11-04" }]);
  });

  it("ships vendors the courier doesn't pick up from, even to local ZIPs", () => {
    const q = quoteFulfillment({ ...vendor, courierPickup: false }, LOCAL, 5000, true, morning("2026-11-03"));
    expect(options(q)[0].method).toBe("overnight_shipping");
  });

  it("pushes local delivery a day when ordered after cutoff", () => {
    expect(options(quoteFulfillment(vendor, LOCAL, 5000, true, evening("2026-11-03")))[0].deliveryDate).toBe("2026-11-05");
  });

  it("never delivers locally on Shabbat", () => {
    expect(options(quoteFulfillment(vendor, LOCAL, 5000, true, morning("2026-11-06")))[0].deliveryDate).toBe("2026-11-08");
  });

  it("offers only overnight for perishables", () => {
    const q = quoteFulfillment(vendor, FAR, 5000, true, morning("2026-11-03"));
    expect(options(q)).toEqual([{ method: "overnight_shipping", fee: 1999, shipDate: "2026-11-03", deliveryDate: "2026-11-04" }]);
  });

  it("adds cheaper 2-day shipping for shelf-stable orders", () => {
    const q = quoteFulfillment(vendor, FAR, 5000, false, morning("2026-11-03"));
    expect(option(q, "two_day_shipping")).toEqual({ method: "two_day_shipping", fee: 999, shipDate: "2026-11-03", deliveryDate: "2026-11-05" });
  });

  it("doesn't offer 2-day when the vendor turned it off", () => {
    expect(option(quoteFulfillment({ ...vendor, twoDayShipFee: null }, FAR, 5000, false, morning("2026-11-03")), "two_day_shipping")).toBeUndefined();
  });

  it("holds perishable boxes placed Friday until Monday", () => {
    expect(option(quoteFulfillment(vendor, FAR, 5000, true, morning("2026-11-06")), "overnight_shipping")).toMatchObject({ shipDate: "2026-11-09", deliveryDate: "2026-11-10" });
  });

  it("lets shelf-stable orders ship Friday", () => {
    const q = quoteFulfillment(vendor, FAR, 5000, false, morning("2026-11-06"));
    expect(option(q, "overnight_shipping")).toMatchObject({ shipDate: "2026-11-06", deliveryDate: "2026-11-09" });
    expect(option(q, "two_day_shipping")).toMatchObject({ shipDate: "2026-11-06", deliveryDate: "2026-11-10" });
  });

  it("waives fees above the free-shipping minimum", () => {
    expect(options(quoteFulfillment(vendor, FAR, 15000, false, morning("2026-11-03"))).map((o) => o.fee)).toEqual([0, 0]);
  });

  it("is unavailable when the vendor doesn't ship and the courier can't reach", () => {
    expect(quoteFulfillment({ ...vendor, shipsNationwide: false }, FAR, 5000, true).available).toBe(false);
  });
});

// Shemini Atzeres / Simchas Torah: Sat Oct 3 – Sun Oct 4, 2026.
describe("quoteFulfillment around Yom Tov", () => {
  it("offers same-day priority courier delivery before Yom Tov", () => {
    const q = quoteFulfillment(vendor, LOCAL, 5000, true, morning("2026-09-29"));
    expect(q).toMatchObject({ holiday: { name: "Shemini Atzeres", firstDay: "2026-10-03" } });
    expect(options(q)[0]).toMatchObject({ deliveryDate: "2026-09-30", priority: { fee: 999, deliveryDate: "2026-09-29" } });
  });

  it("skips Shabbat and Yom Tov for local delivery", () => {
    const o = options(quoteFulfillment(vendor, LOCAL, 5000, true, morning("2026-10-02")))[0];
    expect(o).toMatchObject({ deliveryDate: "2026-10-05", priority: { deliveryDate: "2026-10-02" } });
  });

  it("prices priority differently for overnight and 2-day", () => {
    const q = quoteFulfillment(vendor, FAR, 5000, false, morning("2026-09-29"));
    expect(option(q, "overnight_shipping")?.priority).toEqual({ fee: 1499, shipDate: "2026-09-29", deliveryDate: "2026-09-30" });
    expect(option(q, "two_day_shipping")?.priority).toEqual({ fee: 999, shipDate: "2026-09-29", deliveryDate: "2026-10-01" });
  });

  it("only offers priority on options that arrive before Yom Tov", () => {
    // Thu Oct 1: overnight arrives Fri (before Yom Tov), 2-day would land Mon.
    const q = quoteFulfillment(vendor, FAR, 5000, false, morning("2026-10-01"));
    expect(option(q, "overnight_shipping")?.priority).toBeDefined();
    expect(option(q, "two_day_shipping")).toMatchObject({ deliveryDate: "2026-10-05" });
    expect(option(q, "two_day_shipping")?.priority).toBeUndefined();
  });

  it("never ships perishables into Yom Tov (Pesach 2027)", () => {
    // Wed Apr 21 2027 is Erev Pesach; Thu–Fri are Yom Tov, then Shabbat.
    const o = options(quoteFulfillment(vendor, FAR, 5000, true, morning("2027-04-21")))[0];
    expect(o).toEqual({ method: "overnight_shipping", fee: 1999, shipDate: "2027-04-26", deliveryDate: "2027-04-27" });
  });
});
