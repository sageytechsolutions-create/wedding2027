// Settings the live site can't run without. Checked once when the server starts
// (src/instrumentation.ts) so a bad deploy fails loudly instead of, say, taking
// "demo" orders without charging anyone.
export function productionConfigProblems(env: Record<string, string | undefined> = process.env): string[] {
  const problems: string[] = [];
  const need = (key: string, why: string) => {
    if (!env[key]?.trim()) problems.push(`${key} is not set (${why}).`);
  };

  need("DATABASE_URL", "database connection");
  need("SITE_URL", "links in emails and Stripe redirects");
  if (env.SITE_URL && !env.SITE_URL.startsWith("https://")) problems.push("SITE_URL must start with https:// in production.");
  need("SUPPORT_EMAIL", "shown to customers");

  // DEMO_MODE=true allows a staging site with fake checkout and no real emails.
  if (env.DEMO_MODE !== "true") {
    need("STRIPE_SECRET_KEY", "without it checkout marks orders paid without charging");
    need("STRIPE_WEBHOOK_SECRET", "without it paid orders are never confirmed");
    need("RESEND_API_KEY", "without it no emails are sent");
    need("EMAIL_FROM", "sender address for emails");
    if (env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) problems.push("STRIPE_SECRET_KEY is a test key; use your live key (sk_live_…) or set DEMO_MODE=true for staging.");
  }
  return problems;
}
