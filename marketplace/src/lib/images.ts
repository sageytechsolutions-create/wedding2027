import "server-only";
import sharp, { type Sharp } from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_PRODUCT = 6;

export class ImageError extends Error {}

export interface ProcessedImage {
  large: Buffer;
  small: Buffer;
  width: number;
  height: number;
}

// Turns an uploaded photo into two WebP sizes. Decoding it is also the validation:
// anything that isn't a real image fails here. Photos are rotated upright from their
// EXIF orientation, and all metadata (including phone GPS location) is dropped.
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError("That file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("That photo is too large (8 MB max).");

  let base: Sharp;
  try {
    base = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" }).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
    if (meta.width < 300 || meta.height < 300) throw new ImageError("That photo is too small. Please use one at least 300 × 300 pixels.");
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw new ImageError("That file isn't a photo we can read. Please upload a JPG, PNG or WebP image.");
  }

  const large = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return { large: large.data, small, width: large.info.width, height: large.info.height };
}
