import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [vendors, products] = await Promise.all([
    db.vendor.findMany({ where: { active: true }, select: { slug: true, createdAt: true } }),
    db.product.findMany({ where: { active: true, vendor: { active: true } }, select: { slug: true, createdAt: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/vendors`, changeFrequency: "weekly", priority: 0.8 },
    ...vendors.map((v) => ({ url: `${base}/vendors/${v.slug}`, lastModified: v.createdAt, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.createdAt, priority: 0.6 })),
    ...["terms", "privacy", "shipping"].map((page) => ({ url: `${base}/${page}`, priority: 0.2 })),
  ];
}
