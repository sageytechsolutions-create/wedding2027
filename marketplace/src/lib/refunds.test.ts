import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake Stripe we can inspect; swapped to null to simulate demo mode.
const fake = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
  transfers: { createReversal: vi.fn() },
}));
const state = vi.hoisted(() => ({ stripe: fake as unknown }));
vi.mock("./stripe", () => ({
  get stripe() {
    return state.stripe;
  },
  siteUrl: () => "https://locallegends.test",
}));

import type { CurrentUser } from "./auth";
import { db } from "./db";
import { cancelVendorOrder, refundPriorityFee } from "./refunds";

const admin: CurrentUser = { id: "admin", email: "admin@test", role: "admin", vendorId: null, vendorSlug: null };
let vendorUser: CurrentUser;
let otherVendorUser: CurrentUser;

async function makeOrder(opts: { status?: string; transferId?: string | null; paymentIntent?: string | null; priorityFee?: number; method?: string } = {}) {
  const vendor = await db.vendor.findFirstOrThrow({ where: { slug: "v1" } });
  const product = await db.product.findFirstOrThrow({ where: { vendorId: vendor.id } });
  const order = await db.order.create({
    data: {
      number: `LL-T${Math.random().toString(36).slice(2, 8)}`,
      email: "cust@test",
      name: "Cust Omer",
      address1: "1 St",
      city: "NY",
      state: "NY",
      zip: "10065",
      subtotal: 5000,
      shippingTotal: 999,
      total: 5999,
      paymentStatus: "paid",
      stripePaymentIntentId: opts.paymentIntent === undefined ? "pi_123" : opts.paymentIntent,
      vendorOrders: {
        create: {
          vendorId: vendor.id,
          method: opts.method ?? "overnight_shipping",
          // shippingFee 999 includes the priority fee when there is one.
          priority: (opts.priorityFee ?? 0) > 0,
          priorityFee: opts.priorityFee ?? 0,
          holidayName: opts.priorityFee ? "Shemini Atzeres" : null,
          shipDate: new Date(),
          deliveryDate: new Date(),
          subtotal: 5000,
          shippingFee: 999,
          commission: 1000,
          vendorPayout: 4999,
          status: opts.status ?? "pending",
          stripeTransferId: opts.transferId ?? null,
          items: { create: { productId: product.id, name: "Thing", unitPrice: 5000, quantity: 1 } },
        },
      },
    },
    include: { vendorOrders: true },
  });
  return { order, vo: order.vendorOrders[0] };
}

beforeEach(async () => {
  state.stripe = fake;
  fake.refunds.create.mockReset().mockResolvedValue({ id: "re_1" });
  fake.transfers.createReversal.mockReset().mockResolvedValue({ id: "trr_1" });
  await db.emailLog.deleteMany();
  await db.review.deleteMany();
  await db.productImage.deleteMany();
  await db.user.deleteMany();
  await db.orderItem.deleteMany();
  await db.vendorOrder.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.vendor.deleteMany();
  const base = { tagline: "t", story: "", city: "NY", state: "NY", originZip: "10065" };
  const v1 = await db.vendor.create({
    data: { ...base, slug: "v1", name: "Vendor One", products: { create: { slug: "p1", name: "Thing", description: "d", price: 5000, category: "c" } } },
  });
  const v2 = await db.vendor.create({ data: { ...base, slug: "v2", name: "Vendor Two" } });
  vendorUser = { id: "u1", email: "v1@test", role: "vendor", vendorId: v1.id, vendorSlug: "v1" };
  otherVendorUser = { id: "u2", email: "v2@test", role: "vendor", vendorId: v2.id, vendorSlug: "v2" };
});

describe("cancelVendorOrder", () => {
  it("refunds items plus delivery and records it", async () => {
    const { order, vo } = await makeOrder();
    const result = await cancelVendorOrder(vo.id, "Sold out", vendorUser);

    expect(result).toEqual({ refunded: 5999, warning: undefined });
    expect(fake.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_123", amount: 5999 }),
      { idempotencyKey: `refund-${vo.id}` },
    );
    expect(fake.transfers.createReversal).not.toHaveBeenCalled();
    const saved = await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } });
    expect(saved).toMatchObject({ status: "cancelled", refundAmount: 5999, cancelReason: "Sold out", cancelledBy: "v1@test", stripeRefundId: "re_1" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(5999);
    const email = await db.emailLog.findUniqueOrThrow({ where: { key: `refund:${vo.id}` } });
    expect(email.to).toBe("cust@test");
    expect(email.subject).toContain("$59.99 refunded");
  });

  it("pulls back the vendor's payout if they were already paid", async () => {
    const { vo } = await makeOrder({ transferId: "tr_1" });
    await cancelVendorOrder(vo.id, "Sold out", vendorUser);
    expect(fake.transfers.createReversal).toHaveBeenCalledWith("tr_1", expect.objectContaining({ amount: 4999 }), { idempotencyKey: `reversal-${vo.id}` });
    expect((await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).stripeTransferReversalId).toBe("trr_1");
  });

  it("lets vendors cancel only before it ships; admins any time", async () => {
    const { vo } = await makeOrder({ status: "shipped" });
    expect((await cancelVendorOrder(vo.id, "Oops", vendorUser)).error).toMatch(/already on its way/);
    expect(fake.refunds.create).not.toHaveBeenCalled();
    expect((await cancelVendorOrder(vo.id, "Lost in transit", admin)).refunded).toBe(5999);
  });

  it("won't let a vendor cancel another vendor's order", async () => {
    const { vo } = await makeOrder();
    expect((await cancelVendorOrder(vo.id, "Nope", otherVendorUser)).error).toMatch(/access/);
    expect(fake.refunds.create).not.toHaveBeenCalled();
    expect((await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).status).toBe("pending");
  });

  it("changes nothing if the refund fails", async () => {
    fake.refunds.create.mockRejectedValue(new Error("card_declined"));
    const { order, vo } = await makeOrder();
    const result = await cancelVendorOrder(vo.id, "Sold out", vendorUser);
    expect(result.error).toMatch(/didn't go through/);
    expect((await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).status).toBe("pending");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(0);
    expect(await db.emailLog.count()).toBe(0);
  });

  it("still cancels, with a warning, if pulling back the payout fails", async () => {
    fake.transfers.createReversal.mockRejectedValue(new Error("insufficient_funds"));
    const { vo } = await makeOrder({ transferId: "tr_1" });
    const result = await cancelVendorOrder(vo.id, "Sold out", vendorUser);
    expect(result.warning).toMatch(/payout couldn't be pulled back/);
    expect(await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).toMatchObject({ status: "cancelled", stripeTransferReversalId: null });
  });

  it("never records a refund twice, even with simultaneous clicks", async () => {
    const { order, vo } = await makeOrder();
    await Promise.all([cancelVendorOrder(vo.id, "Sold out", vendorUser), cancelVendorOrder(vo.id, "Sold out", vendorUser)]);
    await cancelVendorOrder(vo.id, "Sold out again", vendorUser);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(5999);
    expect(await db.emailLog.count()).toBe(1);
    // Every Stripe call for this shipment carries the same idempotency key, so Stripe refunds at most once.
    for (const call of fake.refunds.create.mock.calls) expect(call[1]).toEqual({ idempotencyKey: `refund-${vo.id}` });
  });

  it("works without Stripe in demo mode", async () => {
    state.stripe = null;
    const { vo } = await makeOrder({ paymentIntent: null });
    expect((await cancelVendorOrder(vo.id, "Sold out", vendorUser)).refunded).toBe(5999);
    expect(fake.refunds.create).not.toHaveBeenCalled();
    expect((await db.emailLog.findFirstOrThrow()).subject).toContain("refunded");
  });
});

describe("refundPriorityFee (late priority orders)", () => {
  it("refunds only the priority fee, taken from a vendor not yet paid out", async () => {
    const { order, vo } = await makeOrder({ priorityFee: 500 });
    const result = await refundPriorityFee(vo.id, admin);
    expect(result).toEqual({ refunded: 500, warning: undefined });
    expect(fake.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_123", amount: 500 }),
      { idempotencyKey: `priority-refund-${vo.id}` },
    );
    const saved = await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } });
    expect(saved.vendorPayout).toBe(4999 - 500);
    expect(saved.priorityRefundedAt).not.toBeNull();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(500);
    expect((await db.emailLog.findUniqueOrThrow({ where: { key: `priority-refund:${vo.id}` } })).subject).toBe(`Priority fee refunded: $5.00 (${order.number})`);
  });

  it("pulls the fee back from a vendor who was already paid", async () => {
    const { vo } = await makeOrder({ priorityFee: 500, transferId: "tr_1" });
    await refundPriorityFee(vo.id, admin);
    expect(fake.transfers.createReversal).toHaveBeenCalledWith("tr_1", expect.objectContaining({ amount: 500 }), { idempotencyKey: `priority-reversal-${vo.id}` });
    expect(await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).toMatchObject({ vendorPayout: 4999, payoutReversed: 500 });
  });

  it("leaves the vendor alone for courier deliveries (the platform kept that fee)", async () => {
    const { vo } = await makeOrder({ priorityFee: 500, method: "local_delivery", transferId: "tr_1" });
    await refundPriorityFee(vo.id, admin);
    expect(fake.transfers.createReversal).not.toHaveBeenCalled();
    expect(await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).toMatchObject({ vendorPayout: 4999, payoutReversed: 0 });
  });

  it("is admin-only, once-only, and not for regular or cancelled orders", async () => {
    const { order, vo } = await makeOrder({ priorityFee: 500 });
    expect((await refundPriorityFee(vo.id, vendorUser)).error).toMatch(/admins/);
    await Promise.all([refundPriorityFee(vo.id, admin), refundPriorityFee(vo.id, admin)]);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(500);

    const plain = await makeOrder();
    expect((await refundPriorityFee(plain.vo.id, admin)).error).toMatch(/isn't a priority order/);

    const cancelled = await makeOrder({ priorityFee: 500 });
    await cancelVendorOrder(cancelled.vo.id, "Sold out", admin);
    expect((await refundPriorityFee(cancelled.vo.id, admin)).error).toMatch(/cancelled/);
  });

  it("a later cancellation refunds only what's left and pulls back only what's left", async () => {
    const { order, vo } = await makeOrder({ priorityFee: 500, transferId: "tr_1" });
    await refundPriorityFee(vo.id, admin);
    fake.refunds.create.mockClear();
    fake.transfers.createReversal.mockClear();

    const result = await cancelVendorOrder(vo.id, "Lost in transit", admin);
    expect(result.refunded).toBe(5999 - 500);
    expect(fake.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 5499 }), expect.anything());
    expect(fake.transfers.createReversal).toHaveBeenCalledWith("tr_1", expect.objectContaining({ amount: 4999 - 500 }), expect.anything());
    // In total the customer got back exactly what they paid for this shipment.
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(5999);
    expect((await db.vendorOrder.findUniqueOrThrow({ where: { id: vo.id } })).payoutReversed).toBe(4999);
  });
});
