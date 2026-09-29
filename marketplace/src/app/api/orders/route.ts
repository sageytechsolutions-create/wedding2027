import { NextResponse } from "next/server";
import { CheckoutError, checkoutSchema, placeOrder } from "@/lib/orders";

export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: `${first.path.join(".")}: ${first.message}` }, { status: 400 });
  }
  try {
    const order = await placeOrder(parsed.data);
    return NextResponse.json({ number: order.number });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
