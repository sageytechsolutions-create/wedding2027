"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
import { isInCourierArea } from "./fulfillment";
import { KOSHER_LABELS, KOSHER_TYPES } from "./kosher";
import { sendPendingPayouts } from "./orders";
import { siteUrl, stripe } from "./stripe";
import { VENDOR_ORDER_STATUSES } from "./orders";

// NOTE: these actions are unauthenticated in this MVP. Before launch, gate
// vendor actions behind vendor login and admin actions behind an admin role.

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const dollarsToCents = z.coerce.number().min(0).max(100000).transform((d) => Math.round(d * 100));

export async function updateVendorOrder(formData: FormData) {
  const data = z
    .object({
      id: z.string(),
      vendorSlug: z.string(),
      status: z.enum(VENDOR_ORDER_STATUSES),
      carrier: z.string().max(40).optional(),
      trackingNumber: z.string().max(80).optional(),
    })
    .parse(Object.fromEntries(formData));
  await db.vendorOrder.update({
    where: { id: data.id },
    data: { status: data.status, carrier: data.carrier || null, trackingNumber: data.trackingNumber || null },
  });
  revalidatePath(`/vendor/${data.vendorSlug}`);
}

export async function createProduct(formData: FormData) {
  const data = z
    .object({
      vendorId: z.string(),
      vendorSlug: z.string(),
      name: z.string().min(2).max(120),
      description: z.string().min(2).max(2000),
      price: dollarsToCents,
      category: z.string().min(2).max(40),
      serves: z.string().max(20).optional(),
      kosherType: z.enum(KOSHER_TYPES),
      kosherForPassover: z.string().optional(),
      labels: z.array(z.enum(Object.keys(KOSHER_LABELS) as [keyof typeof KOSHER_LABELS])).default([]),
      emoji: z.string().max(8).optional(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      perishable: z.string().optional(),
    })
    .parse({ ...Object.fromEntries(formData), labels: formData.getAll("labels") });
  await db.product.create({
    data: {
      vendorId: data.vendorId,
      slug: `${data.vendorSlug}-${slugify(data.name)}-${Date.now().toString(36)}`,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      serves: data.serves || null,
      kosherType: data.kosherType,
      kosherForPassover: data.kosherForPassover === "on",
      emoji: data.emoji || "🍽️",
      imageUrl: data.imageUrl || null,
      perishable: data.perishable === "on",
      labels: data.labels.join(","),
    },
  });
  revalidatePath(`/vendor/${data.vendorSlug}`);
}

export async function toggleProduct(formData: FormData) {
  const { id, vendorSlug } = z.object({ id: z.string(), vendorSlug: z.string() }).parse(Object.fromEntries(formData));
  const product = await db.product.findUniqueOrThrow({ where: { id } });
  await db.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath(`/vendor/${vendorSlug}`);
}

export async function updateVendorSettings(formData: FormData) {
  const data = z
    .object({
      id: z.string(),
      slug: z.string(),
      overnightShipFee: dollarsToCents,
      twoDayShipFee: z.string().optional(),
      priorityOvernightFee: dollarsToCents,
      priorityTwoDayFee: dollarsToCents,
      freeShippingMin: z.string().optional(),
      shipsNationwide: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  // Blank = none (no free-shipping threshold / no 2-day option).
  const optionalCents = (v?: string) => {
    const cents = v?.trim() ? Math.round(Number(v) * 100) : null;
    return cents != null && Number.isFinite(cents) && cents >= 0 ? cents : null;
  };
  await db.vendor.update({
    where: { id: data.id },
    data: {
      overnightShipFee: data.overnightShipFee,
      twoDayShipFee: optionalCents(data.twoDayShipFee),
      freeShippingMin: optionalCents(data.freeShippingMin),
      shipsNationwide: data.shipsNationwide === "on",
      priorityOvernightFee: data.priorityOvernightFee,
      priorityTwoDayFee: data.priorityTwoDayFee,
    },
  });
  revalidatePath(`/vendor/${data.slug}`);
}

export async function createVendor(formData: FormData) {
  const data = z
    .object({
      name: z.string().min(2).max(100),
      tagline: z.string().min(2).max(160),
      story: z.string().max(2000).optional(),
      city: z.string().min(2).max(80),
      state: z.string().length(2),
      originZip: z.string().regex(/^\d{5}$/),
      emoji: z.string().max(8).optional(),
      certification: z.string().min(1).max(60),
      commissionPercent: z.coerce.number().min(0).max(60),
    })
    .parse(Object.fromEntries(formData));
  let slug = slugify(data.name);
  if (await db.vendor.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  await db.vendor.create({
    data: {
      slug,
      name: data.name,
      tagline: data.tagline,
      story: data.story ?? "",
      city: data.city,
      state: data.state.toUpperCase(),
      originZip: data.originZip,
      emoji: data.emoji || "🍽️",
      certification: data.certification,
      commissionRate: data.commissionPercent / 100,
      // The shared courier picks up from vendors inside its area.
      courierPickup: isInCourierArea(data.originZip),
    },
  });
  redirect(`/vendor/${slug}`);
}

export async function toggleCourierPickup(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  await db.vendor.update({ where: { id }, data: { courierPickup: !vendor.courierPickup } });
  revalidatePath("/admin");
}

export async function toggleVendor(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  await db.vendor.update({ where: { id }, data: { active: !vendor.active } });
  revalidatePath("/admin");
}

// Starts (or resumes) Stripe Express onboarding so the vendor can receive payouts.
export async function connectStripe(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  if (!stripe) throw new Error("Stripe is not configured");
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  let accountId = vendor.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      business_profile: { name: vendor.name, mcc: "5499" }, // misc. food stores
      capabilities: { transfers: { requested: true } },
      metadata: { vendorId: vendor.id },
    });
    accountId = account.id;
    await db.vendor.update({ where: { id }, data: { stripeAccountId: accountId } });
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/vendor/${vendor.slug}`,
    return_url: `${siteUrl()}/vendor/${vendor.slug}`,
  });
  redirect(link.url);
}

// Checks whether the vendor finished Stripe onboarding, and if so sends any payouts they're owed.
export async function refreshStripeStatus(vendorId: string) {
  if (!stripe) return;
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (!vendor.stripeAccountId) return;
  const account = await stripe.accounts.retrieve(vendor.stripeAccountId);
  const enabled = account.payouts_enabled === true && account.capabilities?.transfers === "active";
  if (enabled !== vendor.stripePayoutsEnabled) {
    await db.vendor.update({ where: { id: vendorId }, data: { stripePayoutsEnabled: enabled } });
  }
  if (enabled) await sendPendingPayouts({ vendorId });
}
