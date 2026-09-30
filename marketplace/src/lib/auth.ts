import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "ll_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type CurrentUser = { id: string; email: string; role: "admin" | "vendor"; vendorId: string | null; vendorSlug: string | null };

// Only callable from server actions and route handlers (cookies can't be set while rendering).
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { vendor: { select: { slug: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    role: user.role === "admin" ? "admin" : "vendor",
    vendorId: user.vendorId,
    vendorSlug: user.vendor?.slug ?? null,
  };
});

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== "admin") redirect("/login?error=forbidden");
  return user;
}

// Admins can manage every vendor; vendor users only their own.
export async function requireVendorAccess(vendorId: string, next = "/vendor"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== "admin" && user.vendorId !== vendorId) redirect("/login?error=forbidden");
  return user;
}

// Simple in-memory throttle for sign-in attempts (per email, per server instance).
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60_000;

export function isLockedOut(email: string): boolean {
  const f = failures.get(email);
  return f != null && f.count >= MAX_FAILURES && f.until > Date.now();
}

export function recordFailure(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until < Date.now();
  failures.set(email, { count: fresh ? 1 : f.count + 1, until: Date.now() + LOCKOUT_MS });
}

export function clearFailures(email: string) {
  failures.delete(email);
}
