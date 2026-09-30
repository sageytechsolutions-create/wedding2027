import Link from "next/link";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl font-bold">Forgot your password?</h1>
      <p className="mt-2 text-sm text-stone-500">Enter the email you sign in with and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand">Back to sign in</Link></p>
    </div>
  );
}
