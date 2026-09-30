"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser, requireVendorAccess } from "./auth";
import { db } from "./db";
import { isInCourierArea } from "./fulfillment";
import { deliver } from "./email/send";
import { KOSHER_LABELS, KOSHER_TYPES } from "./kosher";
import { notifyVendorOrderStatus } from "./notifications";
import { VENDOR_ORDER_STATUSES } from "./orders";
import { cancelVendorOrder, refundPriorityFee, type CancelResult } from "./refunds";
import { siteUrl, stripe } from "./stripe";

// Every export here is a public endpoint, so each one checks who is signed in
// and looks up ownership from the database rather than trusting form fields.

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const dollarsToCents = z.coerce.number().min(0).max(100000).transform((d) => Math.round(d * 100));

export async function updateVendorOrder(formData: FormData) {
  const data = z
    .object({
      id: z.string(),
      status: z.enum(VENDOR_ORDER_STATUSES),
      carrier: z.string().max(40).optional(),
      trackingNumber: z.string().max(80).optional(),
    })
    .parse(Object.fromEntries(formData));
  const vendorOrder = await db.vendorOrder.findUniqueOrThrow({ where: { id: data.id }, include: { vendor: true } });
  await requireVendorAccess(vendorOrder.vendorId);
  if (vendorOrder.status === "cancelled") return; // cancelled and refunded; can't be reopened
  await db.vendorOrder.update({
    where: { id: data.id },
    data: { status: data.status, carrier: data.carrier || null, trackingNumber: data.trackingNumber || null },
  });
  if (data.status !== vendorOrder.status) await notifyVendorOrderStatus(vendorOrder.id);
  revalidatePath(`/vendor/${vendorOrder.vendor.slug}`);
}

export async function createProduct(formData: FormData) {
  const data = z
    .object({
      vendorId: z.string(),
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
  await requireVendorAccess(data.vendorId);
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: data.vendorId } });
  await db.product.create({
    data: {
      vendorId: vendor.id,
      slug: `${vendor.slug}-${slugify(data.name)}-${Date.now().toString(36)}`,
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
  revalidatePath(`/vendor/${vendor.slug}`);
}

export async function toggleProduct(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const product = await db.product.findUniqueOrThrow({ where: { id }, include: { vendor: true } });
  await requireVendorAccess(product.vendorId);
  await db.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath(`/vendor/${product.vendor.slug}`);
}

export async function updateVendorSettings(formData: FormData) {
  const data = z
    .object({
      id: z.string(),
      overnightShipFee: dollarsToCents,
      twoDayShipFee: z.string().optional(),
      priorityOvernightFee: dollarsToCents,
      priorityTwoDayFee: dollarsToCents,
      freeShippingMin: z.string().optional(),
      shipsNationwide: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  await requireVendorAccess(data.id);
  // Blank = none (no free-shipping threshold / no 2-day option).
  const optionalCents = (v?: string) => {
    const cents = v?.trim() ? Math.round(Number(v) * 100) : null;
    return cents != null && Number.isFinite(cents) && cents >= 0 ? cents : null;
  };
  const vendor = await db.vendor.update({
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
  revalidatePath(`/vendor/${vendor.slug}`);
}

export async function createVendor(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  await db.vendor.update({ where: { id }, data: { courierPickup: !vendor.courierPickup } });
  revalidatePath("/admin");
}

export async function toggleVendor(formData: FormData) {
  await requireAdmin();
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  await db.vendor.update({ where: { id }, data: { active: !vendor.active } });
  revalidatePath("/admin");
}

// Starts (or resumes) Stripe Express onboarding so the vendor can receive payouts.
export async function connectStripe(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  await requireVendorAccess(id);
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

// Re-sends an email that failed or was only saved to the outbox.
export async function retryEmail(formData: FormData) {
  await requireAdmin("/admin/emails");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const log = await db.emailLog.findUniqueOrThrow({ where: { id } });
  if (log.status !== "sent") await deliver(log);
  revalidatePath("/admin/emails");
}

// Cancel one vendor's part of an order and refund the customer for it.
export async function cancelOrderAction(_prev: CancelResult | undefined, formData: FormData): Promise<CancelResult> {
  const user = await requireUser("/vendor");
  const parsed = z
    .object({ id: z.string().min(1), reason: z.string().trim().min(3, "Please give the customer a short reason.").max(300) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, reason } = parsed.data;
  const result = await cancelVendorOrder(id, reason, user);
  const vo = await db.vendorOrder.findUnique({ where: { id }, include: { vendor: true } });
  if (vo) revalidatePath(`/vendor/${vo.vendor.slug}`);
  revalidatePath("/admin");
  return result;
}

// Admin: refund the priority fee on a priority order that arrived late.
export async function refundPriorityFeeAction(_prev: CancelResult | undefined, formData: FormData): Promise<CancelResult> {
  const admin = await requireAdmin();
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const result = await refundPriorityFee(id, admin);
  const vo = await db.vendorOrder.findUnique({ where: { id }, include: { vendor: true } });
  if (vo) revalidatePath(`/vendor/${vo.vendor.slug}`);
  revalidatePath("/admin");
  return result;
}

// Photos: remove one, or make one the main photo.
async function photoWithAccess(imageId: string) {
  const image = await db.productImage.findUniqueOrThrow({ where: { id: imageId }, include: { product: { include: { vendor: true } } } });
  await requireVendorAccess(image.product.vendorId);
  return image;
}

function revalidateProduct(product: { slug: string; vendor: { slug: string } }) {
  revalidatePath(`/vendor/${product.vendor.slug}`);
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function deletePhoto(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const image = await photoWithAccess(id);
  await db.productImage.delete({ where: { id } });
  revalidateProduct(image.product);
}

export async function makeMainPhoto(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const image = await photoWithAccess(id);
  const first = await db.productImage.findFirst({ where: { productId: image.productId }, orderBy: { position: "asc" } });
  if (first && first.id !== id) await db.productImage.update({ where: { id }, data: { position: first.position - 1 } });
  revalidateProduct(image.product);
}
