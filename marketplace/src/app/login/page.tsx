import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user && error !== "forbidden") redirect(user.role === "admin" ? "/admin" : `/vendor/${user.vendorSlug ?? ""}`);

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl font-bold">Partner sign in</h1>
      <p className="mt-2 text-sm text-stone-500">For vendors and the Local Legends team. Shoppers don&apos;t need an account.</p>
      {error === "forbidden" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {user ? `You're signed in as ${user.email}, which doesn't have access to that page.` : "Please sign in."}
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm">
        <Link href="/forgot-password" className="text-brand">Forgot your password?</Link>
      </p>
    </div>
  );
}
