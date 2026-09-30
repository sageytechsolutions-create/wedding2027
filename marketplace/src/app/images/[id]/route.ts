import { db } from "@/lib/db";

// Serves product photos. Each upload gets a new id, so responses can be cached forever.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const large = new URL(req.url).searchParams.get("size") === "large";
  const image = large
    ? await db.productImage.findUnique({ where: { id }, select: { large: true } }).then((i) => i?.large)
    : await db.productImage.findUnique({ where: { id }, select: { small: true } }).then((i) => i?.small);
  const bytes = image;
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
