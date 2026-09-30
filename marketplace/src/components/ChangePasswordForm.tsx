"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/auth-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const field = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input name="current" type="password" required autoComplete="current-password" placeholder="Current password" className={field} />
      <input name="next" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`} className={field} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Update password</button>
    </form>
  );
}
