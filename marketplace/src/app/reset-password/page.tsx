import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordResetForms";
import { isResetTokenValid } from "@/lib/password-reset";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await isResetTokenValid(token);
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
      {valid ? (
        <>
          <p className="mt-2 text-sm text-stone-500">You&apos;ll be signed out on your other devices.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          This reset link has expired or was already used. <Link href="/forgot-password" className="font-medium text-brand">Request a new one</Link>.
        </p>
      )}
    </div>
  );
}
