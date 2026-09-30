import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImageError, MAX_PHOTOS_PER_PRODUCT, MAX_UPLOAD_BYTES, processImage } from "@/lib/images";

// Upload one photo for a product (multipart form field "photo").
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const product = await db.product.findUnique({ where: { id }, include: { vendor: true, _count: { select: { images: true } } } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  if (user.role !== "admin" && user.vendorId !== product.vendorId) {
    return NextResponse.json({ error: "You can only add photos to your own products." }, { status: 403 });
  }
  if (product._count.images >= MAX_PHOTOS_PER_PRODUCT) {
    return NextResponse.json({ error: `A product can have up to ${MAX_PHOTOS_PER_PRODUCT} photos.` }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo was uploaded." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That photo is too large (8 MB max)." }, { status: 413 });

  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const last = await db.productImage.findFirst({ where: { productId: id }, orderBy: { position: "desc" } });
    const image = await db.productImage.create({
      data: {
        productId: id,
        position: (last?.position ?? -1) + 1,
        width: processed.width,
        height: processed.height,
        large: new Uint8Array(processed.large),
        small: new Uint8Array(processed.small),
      },
      select: { id: true },
    });
    revalidatePath(`/vendor/${product.vendor.slug}`);
    revalidatePath(`/products/${product.slug}`);
    return NextResponse.json({ id: image.id });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
