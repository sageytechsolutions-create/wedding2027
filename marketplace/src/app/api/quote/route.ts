import { NextResponse } from "next/server";
import { z } from "zod";
import { cartLineSchema, quoteCart } from "@/lib/orders";

const bodySchema = z.object({
  zip: z.string(),
  items: z.array(cartLineSchema).min(1).max(50),
});

// Delivery method, fee and arrival date per vendor for a cart + ZIP.
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { groups, missing } = await quoteCart(parsed.data.items, parsed.data.zip);
  return NextResponse.json({
    missing,
    groups: groups.map(({ vendorId, vendorName, subtotal, quote }) => ({ vendorId, vendorName, subtotal, quote })),
  });
}
