import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl font-bold">Your account</h1>
      <p className="mt-2 text-sm text-stone-500">Signed in as {user.email}</p>
      <h2 className="mt-8 font-semibold">Change password</h2>
      <ChangePasswordForm />
    </div>
  );
}
