import { describe, expect, it } from "vitest";
import { isLocalZip, quoteFulfillment, type VendorShippingRules } from "./fulfillment";

const nycVendor: VendorShippingRules = {
  localZipPrefixes: "100, 101,112",
  localDeliveryFee: 999,
  shipsNationwide: true,
  overnightShipFee: 1999,
  freeShippingMin: 15000,
};

// 10am and 4pm New York time (EDT, UTC-4) on the given date.
const morning = (date: string) => new Date(`${date}T14:00:00Z`);
const evening = (date: string) => new Date(`${date}T20:00:00Z`);

describe("isLocalZip", () => {
  it("matches on the 3-digit ZIP prefix", () => {
    expect(isLocalZip(nycVendor, "10012")).toBe(true);
    expect(isLocalZip(nycVendor, "11201")).toBe(true);
    expect(isLocalZip(nycVendor, "90210")).toBe(false);
  });
});

describe("quoteFulfillment", () => {
  it("rejects malformed ZIPs", () => {
    expect(quoteFulfillment(nycVendor, "1234", 5000, true).available).toBe(false);
  });

  it("delivers locally the next day when ordered before cutoff", () => {
    // Tuesday 2026-09-29
    const q = quoteFulfillment(nycVendor, "10012", 5000, true, morning("2026-09-29"));
    expect(q).toMatchObject({ available: true, method: "local_delivery", fee: 999, deliveryDate: "2026-09-30" });
  });

  it("pushes local delivery a day when ordered after cutoff", () => {
    const q = quoteFulfillment(nycVendor, "10012", 5000, true, evening("2026-09-29"));
    expect(q).toMatchObject({ deliveryDate: "2026-10-01" });
  });

  it("skips Sunday for local delivery", () => {
    // Saturday 2026-10-03 morning -> Sunday is skipped -> Monday
    const q = quoteFulfillment(nycVendor, "10012", 5000, true, morning("2026-10-03"));
    expect(q).toMatchObject({ deliveryDate: "2026-10-05" });
  });

  it("ships overnight nationwide and arrives next day", () => {
    const q = quoteFulfillment(nycVendor, "90210", 5000, true, morning("2026-09-29"));
    expect(q).toMatchObject({
      available: true,
      method: "overnight_shipping",
      fee: 1999,
      shipDate: "2026-09-29",
      deliveryDate: "2026-09-30",
    });
  });

  it("holds perishable boxes placed Friday until Monday", () => {
    const q = quoteFulfillment(nycVendor, "90210", 5000, true, morning("2026-10-02"));
    expect(q).toMatchObject({ shipDate: "2026-10-05", deliveryDate: "2026-10-06" });
  });

  it("lets non-perishables ship Friday for Monday delivery", () => {
    const q = quoteFulfillment(nycVendor, "90210", 5000, false, morning("2026-10-02"));
    expect(q).toMatchObject({ shipDate: "2026-10-02", deliveryDate: "2026-10-05" });
  });

  it("waives the fee above the free-shipping minimum", () => {
    const q = quoteFulfillment(nycVendor, "90210", 15000, true, morning("2026-09-29"));
    expect(q).toMatchObject({ fee: 0 });
  });

  it("is unavailable outside the area for local-only vendors", () => {
    const q = quoteFulfillment({ ...nycVendor, shipsNationwide: false }, "90210", 5000, true);
    expect(q.available).toBe(false);
  });
});
