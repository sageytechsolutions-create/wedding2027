"use client";

import { useActionState, useState } from "react";
import { createUser, deleteUser, resetUserPassword, type FormState } from "@/lib/auth-actions";

const field = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

type Row = { id: string; email: string; role: string; vendorName: string | null; isYou: boolean };

// Shows a freshly generated password once, for the admin to pass on.
function NewPassword({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (!state?.password) return null;
  return (
    <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
      {state.message} Temporary password: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{state.password}</code>
      <br />
      Send it to them securely. It won&apos;t be shown again; they can change it under Account after signing in.
    </div>
  );
}

function UserRow({ user }: { user: Row }) {
  const [state, reset, pending] = useActionState(resetUserPassword, undefined);
  return (
    <li className="space-y-2 px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{user.email}</span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{user.role === "admin" ? "Admin" : user.vendorName}</span>
        {user.isYou && <span className="text-xs text-stone-400">(you)</span>}
        <span className="ml-auto flex gap-4">
          <form action={reset}>
            <input type="hidden" name="id" value={user.id} />
            <button disabled={pending} className="text-brand">Reset password</button>
          </form>
          {!user.isYou && (
            <form
              action={deleteUser}
              onSubmit={(e) => {
                if (!confirm(`Remove ${user.email}'s login?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={user.id} />
              <button className="text-stone-400 hover:text-red-600">Remove</button>
            </form>
          )}
        </span>
      </div>
      <NewPassword state={state} />
    </li>
  );
}

export function UserAdmin({ users, vendors }: { users: Row[]; vendors: { id: string; name: string }[] }) {
  const [state, create, pending] = useActionState(createUser, undefined);
  const [role, setRole] = useState("vendor");
  return (
    <div>
      <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white text-sm">
        {users.map((u) => <UserRow key={u.id} user={u} />)}
      </ul>
      <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <summary className="cursor-pointer font-medium">+ Add a login</summary>
        <form action={create} className="mt-4 flex flex-wrap gap-3">
          <input name="email" type="email" required placeholder="Email" className={`${field} min-w-64 flex-1`} />
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={field}>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
          {role === "vendor" && (
            <select name="vendorId" required defaultValue="" className={field}>
              <option value="" disabled>Which vendor?</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Create login</button>
        </form>
        <div className="mt-3">
          <NewPassword state={state} />
        </div>
      </details>
    </div>
  );
}
