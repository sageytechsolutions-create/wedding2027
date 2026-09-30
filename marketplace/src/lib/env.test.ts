import { describe, expect, it } from "vitest";
import { productionConfigProblems } from "./env";

const live = {
  DATABASE_URL: "postgresql://x",
  SITE_URL: "https://locallegends.example",
  SUPPORT_EMAIL: "help@locallegends.example",
  STRIPE_SECRET_KEY: "sk_live_abc",
  STRIPE_WEBHOOK_SECRET: "whsec_abc",
  RESEND_API_KEY: "re_abc",
  EMAIL_FROM: "Local Legends <orders@locallegends.example>",
};

describe("productionConfigProblems", () => {
  it("accepts a complete live config", () => {
    expect(productionConfigProblems(live)).toEqual([]);
  });

  it("refuses to run without Stripe (demo checkout would take free orders)", () => {
    expect(productionConfigProblems({ ...live, STRIPE_SECRET_KEY: "" }).join()).toMatch(/STRIPE_SECRET_KEY/);
  });

  it("rejects Stripe test keys and http URLs in production", () => {
    const problems = productionConfigProblems({ ...live, STRIPE_SECRET_KEY: "sk_test_1", SITE_URL: "http://x" }).join();
    expect(problems).toMatch(/test key/);
    expect(problems).toMatch(/https/);
  });

  it("allows an explicit demo/staging deploy without Stripe or email", () => {
    expect(productionConfigProblems({ DATABASE_URL: "x", SITE_URL: "https://staging.example", SUPPORT_EMAIL: "a@b.c", DEMO_MODE: "true" })).toEqual([]);
  });
});
