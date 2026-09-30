import { beforeEach, describe, expect, it } from "vitest";
import { clearFailures, isLockedOut, recordFailure } from "./auth";
import { db } from "./db";

beforeEach(async () => {
  await db.loginThrottle.deleteMany();
});

describe("sign-in throttle", () => {
  it("locks an email after 5 wrong passwords", async () => {
    for (let i = 0; i < 4; i++) await recordFailure("a@test");
    expect(await isLockedOut("a@test")).toBe(false);
    await recordFailure("a@test");
    expect(await isLockedOut("a@test")).toBe(true);
    expect(await isLockedOut("b@test")).toBe(false);
  });

  it("unlocks when the lockout expires, and on a successful sign-in", async () => {
    for (let i = 0; i < 5; i++) await recordFailure("a@test");
    await db.loginThrottle.update({ where: { email: "a@test" }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect(await isLockedOut("a@test")).toBe(false);

    for (let i = 0; i < 5; i++) await recordFailure("c@test");
    await clearFailures("c@test");
    expect(await isLockedOut("c@test")).toBe(false);
  });
});
