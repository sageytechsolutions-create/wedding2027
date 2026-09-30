# Launch checklist

Everything below is outside the code: accounts to create, settings to enter, and content to load.
Work top to bottom; each step says where to do it.

## 1. Accounts

- [ ] **Domain** for the site (e.g. from Cloudflare, Namecheap or GoDaddy).
- [ ] **Hosting: [Vercel](https://vercel.com)** (made by the Next.js team; the free tier is enough to start).
- [ ] **Database: [Supabase](https://supabase.com) or [Neon](https://neon.tech)** PostgreSQL. Pick a US East region, close to NYC.
- [ ] **Payments: [Stripe](https://stripe.com)**. Activate the account for live payments and turn on **Connect** (Express accounts).
- [ ] **Email: [Resend](https://resend.com)**. Add and verify your domain so emails come from e.g. `orders@yourdomain.com`.

## 2. Deploy

1. In Vercel, **Add New → Project**, import this GitHub repo, and set **Root Directory** to `marketplace`.
   Vercel runs `npm run vercel-build`, which applies database migrations and builds the site.
2. Add these **Environment Variables** in Vercel (Project → Settings → Environment Variables):

   | Variable | Where it comes from |
   |---|---|
   | `DATABASE_URL` | Database dashboard → connection string, **pooled** (Supabase: "Transaction pooler", add `?pgbouncer=true`) |
   | `DIRECT_URL` | Database dashboard → **direct** connection string (used for migrations) |
   | `SITE_URL` | `https://yourdomain.com` (no trailing slash) |
   | `SUPPORT_EMAIL` | The inbox customers should write to |
   | `LEGAL_NAME` | Your company's legal name, shown in the policies and footer |
   | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **live** secret key (`sk_live_…`) |
   | `STRIPE_WEBHOOK_SECRET` | From step 4 below (`whsec_…`) |
   | `RESEND_API_KEY` | Resend → API Keys |
   | `EMAIL_FROM` | `Local Legends <orders@yourdomain.com>` (on your verified domain) |

   The site **refuses to start** if any of these are missing or if Stripe is still on a test key, so a
   half-configured deploy can't take free orders. For a practice/staging site, set `DEMO_MODE=true`
   instead of the Stripe/Resend settings.
3. Deploy, then add your domain in Vercel (Project → Settings → Domains) and follow its DNS instructions.
4. **Stripe webhook**: Stripe → Developers → Webhooks → Add endpoint `https://yourdomain.com/api/stripe/webhook`
   with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.
   Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
5. **First admin login**: from your computer, with the production database URL:
   ```bash
   cd marketplace
   DATABASE_URL="<direct connection string>" npm run create-user -- you@yourdomain.com admin
   ```
   It prints a password. Sign in at `/login` and change it under **Account**.

Do **not** run `npm run setup` or the seed against production: it deletes everything (it refuses unless forced).

## 3. Content

- [ ] **Vendors** (Admin → Onboard a new vendor): real name, city, kitchen ZIP, and **hechsher** for each.
      Jacques Torres Chocolate and Samantha Granola still need a hechsher and address.
- [ ] **Products**: real names, prices, photos (uploaded in the vendor portal), meat/dairy/pareve, labels (Glatt, Cholov Yisroel…), perishable or not.
      The demo "Sample:" products exist only in local/demo databases, not in production.
- [ ] **NYC courier**: turn on **Picks up** (Admin → Vendors) for each vendor the courier collects from, and confirm the
      courier's price matches the $9.99 local fee (set in `src/lib/config.ts`).
- [ ] **Vendor logins** (Admin → Logins) and send each vendor their temporary password.
- [ ] Each vendor opens their portal → **Connect with Stripe** so they can be paid.

## 4. Business and legal

- [ ] **Policies**: `/terms`, `/privacy` and `/shipping` are drafts written to match how the site works.
      Have a lawyer review them, especially the damaged/late order promises and liability wording.
- [ ] **Sales tax**: many states require marketplaces to collect sales tax on behalf of sellers, and food taxability
      varies by state. Talk to an accountant; the site doesn't calculate tax yet ([Stripe Tax](https://stripe.com/tax) can be added).
- [ ] **Business insurance** covering food sold through the marketplace.
- [ ] Agreements with vendors covering commission (20%), refunds, and delivery responsibilities.

## 5. Before announcing

- [ ] Place a real order with your own card, check the confirmation email, have a vendor mark it shipped, then cancel &
      refund one shipment and confirm the money comes back.
- [ ] Check the site closes Friday at 2pm ET and reopens after Shabbat.
- [ ] Set up an uptime monitor (e.g. [Better Stack](https://betterstack.com) or UptimeRobot, free) on
      `https://yourdomain.com/api/health`. It stays up on Shabbat, so it only alerts on real problems.
- [ ] Turn on daily database backups (Supabase and Neon include them on paid plans).
