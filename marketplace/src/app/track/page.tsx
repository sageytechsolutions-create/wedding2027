import { redirect } from "next/navigation";

export const metadata = { title: "Track your order" };

async function track(formData: FormData) {
  "use server";
  const number = String(formData.get("number") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim();
  redirect(`/orders/${encodeURIComponent(number)}?email=${encodeURIComponent(email)}`);
}

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-3xl font-bold">Track your order</h1>
      <form action={track} className="mt-6 space-y-3">
        <input name="number" required placeholder="Order number (e.g. KV-…)" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
        <input name="email" type="email" required placeholder="Email used at checkout" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
        <button className="w-full rounded-full bg-brand py-3 font-medium text-white hover:bg-brand-dark">Find my order</button>
      </form>
    </div>
  );
}
