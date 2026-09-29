import { NextResponse } from "next/server";
import { markOrderExpired, markOrderPaid } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

// Point a Stripe webhook at /api/stripe/webhook with the events
// checkout.session.completed, checkout.session.async_payment_succeeded and checkout.session.expired.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "paid" && session.payment_intent) {
        const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
        await markOrderPaid(session.id, intentId);
      }
      break;
    }
    case "checkout.session.expired":
      await markOrderExpired(event.data.object.id);
      break;
  }
  return NextResponse.json({ received: true });
}
