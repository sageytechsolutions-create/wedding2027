"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth-actions";

const field = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className={field} />
      <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={field} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
