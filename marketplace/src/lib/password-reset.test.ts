import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { isResetTokenValid, requestPasswordReset, resetPassword } from "./password-reset";

let userId: string;

// The reset token only exists in the email, so pull it from the stored copy (outbox mode keeps it).
async function tokenFromEmail(): Promise<string> {
  const email = await db.emailLog.findFirstOrThrow({ where: { key: { startsWith: "password-reset:" } }, orderBy: { createdAt: "desc" } });
  return email.text.match(/token=([A-Za-z0-9_-]+)/)![1];
}

beforeEach(async () => {
  delete process.env.RESEND_API_KEY;
  await db.emailLog.deleteMany();
  await db.passwordReset.deleteMany();
  await db.session.deleteMany();
  await db.loginThrottle.deleteMany();
  await db.user.deleteMany();
  const user = await db.user.create({ data: { email: "staff@shop.test", role: "admin", passwordHash: await hashPassword("old-password-123") } });
  userId = user.id;
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
});

describe("password reset", () => {
  it("emails a single-use link that sets a new password and signs out everywhere", async () => {
    await db.session.create({ data: { tokenHash: "x", userId, expiresAt: new Date(Date.now() + 86_400_000) } });
    await db.loginThrottle.create({ data: { email: "staff@shop.test", failures: 5, lockedUntil: new Date(Date.now() + 600_000) } });

    await requestPasswordReset("  Staff@Shop.test ");
    const token = await tokenFromEmail();
    expect(await isResetTokenValid(token)).toBe(true);

    expect(await resetPassword(token, "brand-new-password")).toEqual({ userId });
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword("brand-new-password", user.passwordHash)).toBe(true);
    expect(await db.session.count({ where: { userId } })).toBe(0);
    expect(await db.loginThrottle.count()).toBe(0);

    // Single use
    expect(await resetPassword(token, "another-password")).toMatchObject({ error: expect.stringMatching(/expired or was already used/) });
  });

  it("stores only a hash of the token", async () => {
    await requestPasswordReset("staff@shop.test");
    const token = await tokenFromEmail();
    const row = await db.passwordReset.findFirstOrThrow();
    expect(row.tokenHash).not.toContain(token);
  });

  it("says nothing and sends nothing for unknown emails", async () => {
    await requestPasswordReset("nobody@shop.test");
    expect(await db.emailLog.count()).toBe(0);
    expect(await db.passwordReset.count()).toBe(0);
  });

  it("limits reset emails to 3 an hour", async () => {
    for (let i = 0; i < 5; i++) await requestPasswordReset("staff@shop.test");
    expect(await db.emailLog.count()).toBe(3);
  });

  it("rejects expired links and short passwords, and a new link cancels older ones on use", async () => {
    await requestPasswordReset("staff@shop.test");
    const first = await tokenFromEmail();
    expect(await resetPassword(first, "short")).toMatchObject({ error: expect.stringMatching(/at least 10/) });
    const later = new Date(Date.now() + 61 * 60_000);
    expect(await isResetTokenValid(first, later)).toBe(false);

    await requestPasswordReset("staff@shop.test");
    const second = await tokenFromEmail();
    await resetPassword(second, "brand-new-password");
    expect(await isResetTokenValid(first)).toBe(false);
  });

  it("only one of two simultaneous resets with the same link wins", async () => {
    await requestPasswordReset("staff@shop.test");
    const token = await tokenFromEmail();
    const results = await Promise.all([resetPassword(token, "first-new-password"), resetPassword(token, "second-new-password")]);
    expect(results.filter((r) => "userId" in r)).toHaveLength(1);
  });

  it("keeps the link out of the stored copy when the email is really sent", async () => {
    process.env.RESEND_API_KEY = "re_test"; // sending will fail offline; the stored copy is what we check
    await requestPasswordReset("staff@shop.test");
    const log = await db.emailLog.findFirstOrThrow();
    expect(log.sensitive).toBe(true);
    expect(log.text).not.toMatch(/token=[A-Za-z0-9_-]{20,}/);
    expect(log.text).toContain("[removed for security]");
  });
});
