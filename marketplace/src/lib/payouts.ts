import "server-only";
import { db } from "./db";
import { sendPendingPayouts } from "./orders";
import { stripe } from "./stripe";

// Checks whether the vendor finished Stripe onboarding, and if so sends any payouts they're owed.
// Deliberately not a server action: it's only called from the vendor portal after the access check.
export async function refreshStripeStatus(vendorId: string) {
  if (!stripe) return;
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (!vendor.stripeAccountId) return;
  const account = await stripe.accounts.retrieve(vendor.stripeAccountId);
  const enabled = account.payouts_enabled === true && account.capabilities?.transfers === "active";
  if (enabled !== vendor.stripePayoutsEnabled) {
    await db.vendor.update({ where: { id: vendorId }, data: { stripePayoutsEnabled: enabled } });
  }
  if (enabled) await sendPendingPayouts({ vendorId });
}
