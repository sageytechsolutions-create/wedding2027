"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
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
      emoji: z.string().max(8).optional(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      perishable: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  await db.product.create({
    data: {
      vendorId: data.vendorId,
      slug: `${data.vendorSlug}-${slugify(data.name)}-${Date.now().toString(36)}`,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      serves: data.serves || null,
      emoji: data.emoji || "🍽️",
      imageUrl: data.imageUrl || null,
      perishable: data.perishable === "on",
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
      localZipPrefixes: z.string().max(500),
      localDeliveryFee: dollarsToCents,
      overnightShipFee: dollarsToCents,
      freeShippingMin: z.string().optional(),
      shipsNationwide: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  const freeMin = data.freeShippingMin?.trim() ? Math.round(Number(data.freeShippingMin) * 100) : null;
  await db.vendor.update({
    where: { id: data.id },
    data: {
      localZipPrefixes: data.localZipPrefixes
        .split(/[\s,]+/)
        .filter((p) => /^\d{3}$/.test(p))
        .join(","),
      localDeliveryFee: data.localDeliveryFee,
      overnightShipFee: data.overnightShipFee,
      freeShippingMin: freeMin != null && Number.isFinite(freeMin) ? freeMin : null,
      shipsNationwide: data.shipsNationwide === "on",
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
      commissionRate: data.commissionPercent / 100,
      // Default the delivery area to the vendor's own ZIP3; they can widen it in the portal.
      localZipPrefixes: data.originZip.slice(0, 3),
    },
  });
  redirect(`/vendor/${slug}`);
}

export async function toggleVendor(formData: FormData) {
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id } });
  await db.vendor.update({ where: { id }, data: { active: !vendor.active } });
  revalidatePath("/admin");
}
