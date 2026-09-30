import { beforeEach, describe, expect, it } from "vitest";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { canReview, publicName, replyToReview, setReviewHidden, submitReview } from "./reviews";

const admin: CurrentUser = { id: "a", email: "admin@test", role: "admin", vendorId: null, vendorSlug: null };
const NOW = new Date("2026-11-10T15:00:00Z");

async function setup(status = "delivered", deliveryDate = new Date("2026-11-05T00:00:00Z")) {
  const vendor = await db.vendor.create({
    data: { slug: "v", name: "V", tagline: "t", story: "", city: "NY", state: "NY", originZip: "10065", products: { create: { slug: "p", name: "Babka", description: "d", price: 1000, category: "c" } } },
    include: { products: true },
  });
  const product = vendor.products[0];
  const order = await db.order.create({
    data: {
      number: "LL-REV1", email: "Dana@Example.com", name: "dana van levi", address1: "1", city: "NY", state: "NY", zip: "10065",
      subtotal: 1000, shippingTotal: 0, total: 1000, paymentStatus: "paid",
      vendorOrders: {
        create: {
          vendorId: vendor.id, method: "overnight_shipping", shipDate: deliveryDate, deliveryDate, subtotal: 1000, shippingFee: 0,
          commission: 200, vendorPayout: 800, status,
          items: { create: { productId: product.id, name: "Babka", unitPrice: 1000, quantity: 1 } },
        },
      },
    },
    include: { vendorOrders: { include: { items: true } } },
  });
  const vendorUser: CurrentUser = { id: "u", email: "v@test", role: "vendor", vendorId: vendor.id, vendorSlug: "v" };
  return { product, itemId: order.vendorOrders[0].items[0].id, vendorUser };
}

const input = (itemId: string, over: Partial<Parameters<typeof submitReview>[0]> = {}) => ({
  number: "LL-REV1", email: "dana@example.com", orderItemId: itemId, rating: 5, body: "Best babka I've ever had!", ...over,
});

beforeEach(async () => {
  await db.review.deleteMany();
  await db.orderItem.deleteMany();
  await db.vendorOrder.deleteMany();
  await db.order.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.user.deleteMany();
  await db.vendor.deleteMany();
});

describe("publicName", () => {
  it("shows first name and last initial only", () => {
    expect(publicName("dana van levi")).toBe("dana L.");
    expect(publicName("Cher")).toBe("Cher");
  });
});

describe("canReview", () => {
  it("allows delivered orders, or on-the-way orders past their delivery date, within the window", () => {
    const d = new Date("2026-11-05T00:00:00Z");
    expect(canReview({ status: "delivered", deliveryDate: d }, NOW)).toBe(true);
    expect(canReview({ status: "shipped", deliveryDate: d }, NOW)).toBe(true);
    expect(canReview({ status: "shipped", deliveryDate: new Date("2026-11-20T00:00:00Z") }, NOW)).toBe(false);
    expect(canReview({ status: "preparing", deliveryDate: d }, NOW)).toBe(false);
    expect(canReview({ status: "delivered", deliveryDate: new Date("2026-01-01T00:00:00Z") }, NOW)).toBe(false);
  });
});

describe("submitReview", () => {
  it("publishes a verified review and updates the product's stars", async () => {
    const { product, itemId } = await setup();
    expect(await submitReview(input(itemId, { rating: 4 }), NOW)).toEqual({});
    const review = await db.review.findUniqueOrThrow({ where: { orderItemId: itemId } });
    expect(review).toMatchObject({ rating: 4, authorName: "dana L.", hidden: false });
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 1, ratingSum: 4 });
  });

  it("requires the right order number and email", async () => {
    const { itemId } = await setup();
    expect((await submitReview(input(itemId, { email: "someone@else.com" }), NOW)).error).toMatch(/couldn't find/);
    expect((await submitReview(input(itemId, { number: "LL-OTHER" }), NOW)).error).toMatch(/couldn't find/);
  });

  it("waits for delivery, and refuses cancelled items", async () => {
    const pending = await setup("preparing");
    expect((await submitReview(input(pending.itemId), NOW)).error).toMatch(/once it's been delivered/);
    await db.review.deleteMany(); await db.orderItem.deleteMany(); await db.vendorOrder.deleteMany(); await db.order.deleteMany(); await db.product.deleteMany(); await db.vendor.deleteMany();
    const cancelled = await setup("cancelled");
    expect((await submitReview(input(cancelled.itemId), NOW)).error).toMatch(/can't be reviewed/);
  });

  it("allows one review per item, even with simultaneous submissions", async () => {
    const { product, itemId } = await setup();
    const results = await Promise.all([submitReview(input(itemId), NOW), submitReview(input(itemId), NOW)]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect((await submitReview(input(itemId), NOW)).error).toMatch(/already reviewed/);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 1, ratingSum: 5 });
  });
});

describe("moderation and replies", () => {
  it("hiding and restoring a review keeps the stars in sync", async () => {
    const { product, itemId, vendorUser } = await setup();
    await submitReview(input(itemId, { rating: 2 }), NOW);
    const review = await db.review.findUniqueOrThrow({ where: { orderItemId: itemId } });
    await expect(setReviewHidden(review.id, true, vendorUser)).rejects.toThrow(/admins/);
    await setReviewHidden(review.id, true, admin);
    await setReviewHidden(review.id, true, admin); // no double-counting
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 0, ratingSum: 0 });
    await setReviewHidden(review.id, false, admin);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 1, ratingSum: 2 });
  });

  it("lets only that vendor (or an admin) reply", async () => {
    const { itemId, vendorUser } = await setup();
    await submitReview(input(itemId), NOW);
    const review = await db.review.findUniqueOrThrow({ where: { orderItemId: itemId } });
    const stranger: CurrentUser = { ...vendorUser, vendorId: "someone-else" };
    expect((await replyToReview(review.id, "Thanks!", stranger)).error).toMatch(/own products/);
    expect(await replyToReview(review.id, "Thank you so much, Dana!", vendorUser)).toEqual({});
    expect((await db.review.findUniqueOrThrow({ where: { id: review.id } })).vendorReply).toBe("Thank you so much, Dana!");
  });
});
