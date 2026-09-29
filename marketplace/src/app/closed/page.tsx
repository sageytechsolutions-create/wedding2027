import { currentStoreStatus } from "@/lib/store-hours";
import { site } from "@/lib/config";

export const metadata = { title: "Closed" };

export default function ClosedPage() {
  const status = currentStoreStatus();
  const reason = status.open ? "Shabbat" : status.reason;
  const greeting = reason === "Shabbat" ? "Good Shabbos!" : reason === "Yom Kippur" ? "G'mar Chasima Tova" : "Chag Sameach!";
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <div className="text-6xl">🕯️🕯️</div>
      <h1 className="mt-6 font-display text-4xl font-bold">{greeting}</h1>
      <p className="mt-4 text-lg text-stone-700">
        {site.name} is closed for {reason}.
        {!status.open && <> We reopen {status.reopens}.</>}
      </p>
      <p className="mt-2 text-stone-500">Orders placed before closing will be delivered as scheduled.</p>
    </div>
  );
}
