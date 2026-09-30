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

// Sign-in throttle: 5 wrong passwords within 15 minutes locks that email for 15 minutes.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

export async function isLockedOut(email: string): Promise<boolean> {
  const row = await db.loginThrottle.findUnique({ where: { email } });
  return row?.lockedUntil != null && row.lockedUntil > new Date();
}

export async function recordFailure(email: string) {
  const now = new Date();
  const row = await db.loginThrottle.findUnique({ where: { email } });
  // Start counting again if the last failure was long ago (or a lockout has expired).
  const stale = !row || row.updatedAt.getTime() < now.getTime() - WINDOW_MS || (row.lockedUntil != null && row.lockedUntil <= now);
  const failures = stale ? 1 : row.failures + 1;
  const lockedUntil = failures >= MAX_FAILURES ? new Date(now.getTime() + WINDOW_MS) : null;
  await db.loginThrottle.upsert({
    where: { email },
    create: { email, failures, lockedUntil },
    update: { failures, lockedUntil },
  });
}

export async function clearFailures(email: string) {
  await db.loginThrottle.deleteMany({ where: { email } });
}
