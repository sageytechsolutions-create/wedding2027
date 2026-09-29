import { CheckoutForm } from "@/components/CheckoutForm";
import { stripe } from "@/lib/stripe";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return <CheckoutForm stripeEnabled={stripe != null} cancelled={cancelled === "1"} />;
}
