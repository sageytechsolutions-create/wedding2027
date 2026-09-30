"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearFailures,
  endSession,
  isLockedOut,
  recordFailure,
  requireAdmin,
  requireUser,
  startSession,
} from "./auth";
import { db } from "./db";
import { MIN_PASSWORD_LENGTH, generatePassword, hashPassword, verifyPassword } from "./password";

export type FormState = { error?: string; message?: string; password?: string } | undefined;

// Only allow redirects back into this site after signing in.
function safeNext(next: unknown, fallback: string): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

// A real hash to check against when the email doesn't exist, so timing matches a real account.
let dummyHash: Promise<string> | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (isLockedOut(email)) return { error: "Too many attempts. Try again in 15 minutes." };

  const user = await db.user.findUnique({ where: { email }, include: { vendor: { select: { slug: true } } } });
  // Always run a hash check so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("not-a-real-password"))));
  if (!user || !ok) {
    recordFailure(email);
    return { error: "Incorrect email or password." };
  }
  clearFailures(email);
  await startSession(user.id);
  const home = user.role === "admin" ? "/admin" : `/vendor/${user.vendor?.slug ?? ""}`;
  redirect(safeNext(formData.get("next"), home));
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) return { error: "Your current password is incorrect." };
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Sign out everywhere else.
  await db.session.deleteMany({ where: { userId: user.id } });
  await startSession(user.id);
  return { message: "Password updated." };
}

// Admin: create a login. The generated password is shown to the admin once, to pass on to the person.
export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email(),
      role: z.enum(["admin", "vendor"]),
      vendorId: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email." };
  const { email, role, vendorId } = parsed.data;
  if (role === "vendor" && !vendorId) return { error: "Pick which vendor this login is for." };
  if (await db.user.findUnique({ where: { email } })) return { error: "That email already has a login." };

  const password = generatePassword();
  await db.user.create({
    data: { email, role, vendorId: role === "vendor" ? vendorId : null, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/admin");
  return { message: `Login created for ${email}.`, password };
}

export async function resetUserPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  const password = generatePassword();
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId: id } });
  return { message: `New password for ${user.email}.`, password };
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return; // don't lock yourself out
  await db.user.deleteMany({ where: { id } });
  revalidatePath("/admin");
}

