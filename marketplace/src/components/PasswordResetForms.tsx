"use client";

import { useActionState } from "react";
import { completePasswordReset, forgotPassword } from "@/lib/auth-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const field = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2";
const button = "w-full rounded-full bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-50";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);
  if (state?.message) return <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{state.message}</p>;
  return (
    <form action={action} className="mt-6 space-y-3">
      <input name="email" type="email" required autoComplete="email" placeholder="Your email" className={field} />
      <button disabled={pending} className={button}>{pending ? "Sending…" : "Email me a reset link"}</button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordReset, undefined);
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`} className={field} />
      <input name="confirm" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Type it again" className={field} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={button}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
