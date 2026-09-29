import Stripe from "stripe";

// Payments run in demo mode (orders marked paid, no card charged) until
// STRIPE_SECRET_KEY is set.
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
