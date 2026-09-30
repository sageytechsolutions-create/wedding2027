import { describe, expect, it } from "vitest";
import { trackingUrl } from "../tracking";
import { escapeHtml, orderConfirmationEmail, shippedEmail, vendorNewOrderEmail } from "./templates";

const shipTo = { name: "Dana <script>alert(1)</script> Levi", address1: "1 Ocean Pkwy", address2: null, city: "Brooklyn", state: "NY", zip: "11230" };
const items = [{ name: "Challah Pair", quantity: 2, unitPrice: 1800 }];

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("orderConfirmationEmail", () => {
  const email = orderConfirmationEmail({
    number: "LL-TEST1",
    orderUrl: "https://example.com/orders/LL-TEST1?email=a%40b.com",
    shipTo,
    giftMessage: "Mazel tov! <b>",
    subtotal: 3600,
    shippingTotal: 999,
    total: 4599,
    shipments: [
      { vendorName: "Ouri's Market", method: "local_delivery", deliveryDate: new Date("2026-10-01T00:00:00Z"), priority: true, holidayName: "Shemini Atzeres", shippingFee: 999, items },
    ],
  });

  it("summarizes the order", () => {
    expect(email.subject).toBe("Order confirmed: LL-TEST1");
    expect(email.text).toContain("Ouri's Market: Local next-day delivery, arrives Thursday, October 1 (priority before Shemini Atzeres)");
    expect(email.text).toContain("2 x Challah Pair  $36.00");
    expect(email.text).toContain("Total $45.99");
    expect(email.html).toContain("https://example.com/orders/LL-TEST1?email=a%40b.com");
  });

  it("never lets customer text inject HTML", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Dana &lt;script&gt;");
    expect(email.html).toContain("Mazel tov! &lt;b&gt;");
  });
});

describe("shippedEmail", () => {
  it("links to carrier tracking", () => {
    const email = shippedEmail({
      number: "LL-TEST1",
      orderUrl: "https://example.com/o",
      customerName: "Dana Levi",
      vendorName: "Jacques Torres Chocolate",
      method: "two_day_shipping",
      status: "shipped",
      deliveryDate: new Date("2026-10-02T00:00:00Z"),
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      trackingUrl: trackingUrl("UPS", "1Z999AA10123456784"),
      items,
      perishable: false,
    });
    expect(email.subject).toBe("Your Jacques Torres Chocolate order has shipped (LL-TEST1)");
    expect(email.html).toContain("https://www.ups.com/track?tracknum=1Z999AA10123456784");
    expect(email.text).toContain("UPS tracking number 1Z999AA10123456784");
    expect(email.text).not.toContain("refrigerate");
  });

  it("says out for delivery for the courier", () => {
    const email = shippedEmail({
      number: "LL-TEST1", orderUrl: "https://example.com/o", customerName: "Dana", vendorName: "Eshel", method: "local_delivery",
      status: "out_for_delivery", deliveryDate: new Date("2026-10-01T00:00:00Z"), carrier: null, trackingNumber: null, trackingUrl: null, items, perishable: true,
    });
    expect(email.subject).toBe("Your Eshel order is out for delivery (LL-TEST1)");
    expect(email.html).toContain("View your order");
    expect(email.text).toContain("refrigerate");
  });
});

describe("vendorNewOrderEmail", () => {
  it("flags priority orders and shows the payout", () => {
    const email = vendorNewOrderEmail({
      vendorName: "Eshel", number: "LL-TEST1", portalUrl: "https://example.com/vendor/eshel", method: "overnight_shipping",
      shipDate: new Date("2026-09-30T00:00:00Z"), deliveryDate: new Date("2026-10-01T00:00:00Z"), priority: true,
      holidayName: "Shemini Atzeres", items, shipTo, giftMessage: null, payout: 2880,
    });
    expect(email.subject).toBe("⚡ Priority New order LL-TEST1: Ship by Wednesday, September 30");
    expect(email.text).toContain("Your payout: $28.80");
  });
});

describe("trackingUrl", () => {
  it("knows the major carriers", () => {
    expect(trackingUrl("FedEx", "123")).toBe("https://www.fedex.com/fedextrack/?trknbr=123");
    expect(trackingUrl("usps", "9400")).toContain("usps.com");
    expect(trackingUrl(null, "1ZABC")).toContain("ups.com");
    expect(trackingUrl("Bob's Trucks", "123")).toBeNull();
    expect(trackingUrl("UPS", null)).toBeNull();
  });
});
