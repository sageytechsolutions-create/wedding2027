// Photo URLs, safe to use anywhere (no image processing imports).

export type PhotoSize = "small" | "large";

export function photoUrl(imageId: string, size: PhotoSize = "small"): string {
  return `/images/${imageId}${size === "large" ? "?size=large" : ""}`;
}

// The picture to show for a product: its main uploaded photo, else a legacy image URL, else none (emoji fallback).
export function productPhotoUrl(p: { images?: { id: string }[]; imageUrl?: string | null }, size: PhotoSize = "small"): string | null {
  const main = p.images?.[0];
  if (main) return photoUrl(main.id, size);
  return p.imageUrl ?? null;
}

// Prisma include for the main photo's id.
export const mainPhoto = { images: { orderBy: { position: "asc" }, take: 1, select: { id: true } } } as const;
