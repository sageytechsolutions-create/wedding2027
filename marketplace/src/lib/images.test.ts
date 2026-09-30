import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageError, processImage } from "./images";

const photo = (width: number, height: number, withExif = false) => {
  let img = sharp({ create: { width, height, channels: 3, background: "#c2410c" } }).jpeg();
  // EXIF orientation 6 = "rotate 90° clockwise to display", plus a fake camera tag.
  if (withExif) img = img.withMetadata({ orientation: 6, exif: { IFD0: { Make: "PhoneCo", Model: "Snap 9" } } });
  return img.toBuffer();
};

describe("processImage", () => {
  it("makes large and small WebP versions within the size limits", async () => {
    const out = await processImage(await photo(4000, 3000));
    const large = await sharp(out.large).metadata();
    const small = await sharp(out.small).metadata();
    expect(large).toMatchObject({ format: "webp", width: 1600, height: 1200 });
    expect(small).toMatchObject({ format: "webp", width: 600, height: 450 });
    expect(out).toMatchObject({ width: 1600, height: 1200 });
  });

  it("doesn't enlarge small photos", async () => {
    const out = await processImage(await photo(500, 400));
    expect(await sharp(out.large).metadata()).toMatchObject({ width: 500, height: 400 });
  });

  it("rotates phone photos upright and strips their metadata", async () => {
    const out = await processImage(await photo(800, 400, true));
    const meta = await sharp(out.large).metadata();
    expect(meta).toMatchObject({ width: 400, height: 800 }); // rotated
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("rejects files that aren't images, and tiny images", async () => {
    await expect(processImage(Buffer.from("<script>alert(1)</script>"))).rejects.toThrow(ImageError);
    await expect(processImage(Buffer.alloc(0))).rejects.toThrow(/empty/);
    await expect(processImage(await photo(100, 100))).rejects.toThrow(/too small/);
  });
});
