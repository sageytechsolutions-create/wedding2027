import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { sendEmail } from "./email/send";
import { passwordResetEmail } from "./email/templates";
import { MIN_PASSWORD_LENGTH, hashPassword } from "./password";
import { siteUrl } from "./stripe";

export const RESET_LINK_MINUTES = 60;
const MAX_REQUESTS_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Emails a reset link if the address has an account. Callers always show the same
// message either way, so this never reveals whether an email is registered.
export async function requestPasswordReset(emailInput: string, now = new Date()): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;

  // Don't let anyone flood an inbox with reset emails.
  const recent = await db.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - 3_600_000) } } });
  if (recent >= MAX_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  const reset = await db.passwordReset.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(now.getTime() + RESET_LINK_MINUTES * 60_000) },
  });
  const resetUrl = `${siteUrl()}/reset-password?token=${token}`;
  await sendEmail({
    key: `password-reset:${reset.id}`,
    to: user.email,
    ...passwordResetEmail({ resetUrl, minutes: RESET_LINK_MINUTES }),
    secrets: [token],
  });
}

async function findUsable(token: string, now: Date) {
  if (!token) return null;
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!reset || reset.usedAt || reset.expiresAt <= now) return null;
  return reset;
}

export async function isResetTokenValid(token: string, now = new Date()): Promise<boolean> {
  return (await findUsable(token, now)) != null;
}

// Sets the new password, uses up the link, cancels any other outstanding links,
// signs the account out everywhere, and lifts any sign-in lockout.
export async function resetPassword(token: string, newPassword: string, now = new Date()): Promise<{ userId: string } | { error: string }> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { error: `Please use at least ${MIN_PASSWORD_LENGTH} characters.` };
  const reset = await findUsable(token, now);
  if (!reset) return { error: "This reset link has expired or was already used. Please request a new one." };

  const passwordHash = await hashPassword(newPassword);
  const used = await db.$transaction(async (tx) => {
    // Only one request can use the link, even if it's submitted twice at once.
    const { count } = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: now } });
    if (count === 0) return false;
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: now } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.loginThrottle.deleteMany({ where: { email: reset.user.email } });
    return true;
  });
  if (!used) return { error: "This reset link has expired or was already used. Please request a new one." };
  return { userId: reset.userId };
}
