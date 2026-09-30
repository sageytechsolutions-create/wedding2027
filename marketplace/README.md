# Local Legends: multi-vendor kosher food marketplace

A Goldbelly-style marketplace for kosher food. Many certified vendors (delis, bakeries, grills) list
products; a customer buys from any of them in one checkout; each vendor ships their
part of the order themselves.

- **Local next-day delivery** in NYC by one shared courier service for all vendors. The area and fees are set platform-wide in `src/lib/config.ts`, the fees are kept by the platform to pay the courier, and Admin controls which vendors the courier picks up from.
- **Overnight or 2-day shipping nationwide** everywhere else. 2-day is offered for shelf-stable orders only. Perishables ship Mon–Thu only and never into Yom Tov, so boxes never sit in a warehouse.
- **Shabbat & Yom Tov**: the whole site closes at 2pm ET on Erev Shabbat / Erev Yom Tov and reopens one hour after that day's New York sunset. Nothing is prepared or delivered on those days. Uses the diaspora calendar from [@hebcal/core](https://github.com/hebcal/hebcal-es6).
- **Priority holiday delivery**: in the two weeks before Yom Tov, customers can add priority to any delivery option that arrives before the holiday. The order is packed first and guaranteed to arrive in time; local orders placed before 2pm arrive the same day. Vendors set separate priority fees for overnight and 2-day; the local priority fee is platform-wide.
- **Kosher info**: vendor hechsher; products marked meat / dairy / pareve, Kosher for Passover, and Glatt, Chassidishe Shechita, Cholov Yisroel, Pas Yisroel, Bishul Yisroel, Yoshon, Non-Gebrokts. Shoppers can filter by all of these.
- **Payments**: Stripe Checkout, with each vendor's share (items minus commission, plus their shipping/priority fees) sent automatically to their Stripe Connect account.

## Run it

Going live? See **[LAUNCH.md](LAUNCH.md)** for the step-by-step checklist.

```bash
cd marketplace
docker compose up -d     # local PostgreSQL (dev + test databases)
npm install
cp .env.example .env
npm run setup     # applies migrations, seeds the launch vendors, and prints demo logins
npm run dev       # http://localhost:3000
npm test          # delivery, holiday, email, refund and sign-in tests (uses the locallegends_test database)
```

## What's here

| Area | Path | What it does |
|---|---|---|
| Storefront | `/`, `/shop`, `/vendors`, `/vendors/[slug]`, `/products/[slug]` | Browse, search, filter by category, "when can I get it?" ZIP check |
| Cart & checkout | `/cart`, `/checkout` | One cart across vendors; live delivery method, fee and arrival date per vendor |
| Order status | `/orders/[number]?email=…`, `/track` | Confirmation and per-vendor tracking |
| Vendor portal | `/vendor`, `/vendor/[slug]` | Fulfill orders (status, carrier, tracking), add/hide products, set delivery ZIPs & fees |
| Admin | `/admin` | Sales, platform commission, vendor payouts, onboard/deactivate vendors |

Key logic:

- `src/lib/fulfillment.ts`: delivery method, fee, ship date and arrival date (cutoff 2pm ET, set in `src/lib/config.ts`).
- `src/lib/orders.ts`: re-prices the cart from the database, splits each order into one `VendorOrder` per vendor, and computes commission and vendor payout.
- `prisma/schema.prisma`: Vendor, Product, Order → VendorOrder → OrderItem.

## Product photos

Vendors add up to 6 photos per product in their portal (the first is the main photo; they can reorder and delete).
Big phone photos are shrunk in the browser before upload, which keeps them under the host's ~4.5 MB request limit.
The server then checks that each file really is an image, turns it upright, strips its metadata (including phone GPS
location), and stores two WebP sizes in the database (`ProductImage`). They're served from `/images/<id>` with
year-long caching. For a much larger catalog, move the image bytes to object storage (e.g. Cloudflare R2 or S3).

## Logins

Shoppers check out as guests. Vendors and the Local Legends team sign in at `/login`.

- **Admin**: the admin dashboard, every vendor portal, onboarding vendors, and managing logins.
- **Vendor**: only their own portal (orders, products, shipping settings, Stripe payouts). Every vendor/admin action re-checks access on the server, so editing a form can't reach another vendor's data.

Create the first admin on a new database:

```bash
npm run create-user -- you@yourcompany.com admin
```

It prints a generated password. After that, add vendor logins from **Admin → Logins**. The temporary password is shown once, to pass on to the vendor, who can change it under **Account**. Admins can reset a forgotten password from the same list.

Passwords are hashed with scrypt; sessions are random tokens stored hashed in the database, in an httpOnly cookie that lasts 30 days. Repeated wrong passwords lock an email out for 15 minutes.

## Emails

| Email | To | When |
|---|---|---|
| Order confirmed | Customer | Payment succeeds (or at checkout in demo mode) |
| New order | Each login for that vendor | Same time; flags ⚡ priority orders, shows ship-by date and payout |
| Shipped / Out for delivery | Customer | Vendor marks their part "Shipped" (with carrier tracking link) or "Out for delivery" (courier) |
| Cancelled & refunded | Customer | Vendor (or admin) cancels their part of the order |
| Priority fee refunded | Customer | Admin refunds the priority fee on a late priority order |

Each email is sent at most once (a vendor toggling the status back and forth doesn't resend). Every email is kept in **Admin → Emails** with a preview, its status, and a Retry button for failures. A failed email never blocks checkout or order updates.

To actually send them, create a [Resend](https://resend.com) account, verify your domain, and set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain) in `.env`. Without a key, emails are saved to the outbox only.

## Cancellations and refunds

Each vendor's part of an order can be cancelled on its own with **Cancel & refund** in the vendor portal. The vendor gives a reason, which is emailed to the customer.

- **Who**: vendors until the order is on its way (Pending / Preparing); admins at any time, e.g. a package lost in transit.
- **Refund**: the customer gets that shipment's full amount back (items + delivery, including any priority fee) on their card through Stripe. Other vendors' parts of the order are unaffected.
- **Vendor payout**: if the vendor was already paid, the payout is pulled back from their Stripe account automatically. If that fails, the customer is still refunded and the admin dashboard lists the payout to reverse by hand.
- **Safety**: the refund happens first, and nothing changes if it fails. Stripe calls use idempotency keys and the database only records a cancellation once, so double clicks or retries never refund twice. Cancelled shipments can't be reopened.
- Stripe doesn't return its processing fee on refunds, so the platform absorbs it.

### On-time guarantee for priority orders

If a priority order arrives late, the customer gets the priority fee back (promised on `/shipping`).
Priority orders past their guaranteed date and not marked delivered are listed on the admin dashboard with a
**Refund priority fee** button (admins only). It refunds just that fee and emails the customer. For shipped orders
the vendor received the fee, so it comes back out of their payout; for NYC courier deliveries the platform kept
it and absorbs it. A later cancellation of the same order refunds only what's left.

## Turning on Stripe payments

Without keys, checkout runs in demo mode (orders are marked paid, no card is charged).

1. In the Stripe dashboard, enable **Connect** (Express accounts).
2. Put your secret key in `.env` as `STRIPE_SECRET_KEY` (start with `sk_test_…`) and set `SITE_URL`.
3. Add a webhook endpoint at `{SITE_URL}/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`, then put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Each vendor opens their portal and clicks **Connect with Stripe**. Payouts for orders received before they connect are sent when they finish.

## Production

- PostgreSQL with Prisma migrations (`prisma/migrations`). `npm run db:migrate` applies them; Vercel does this on every deploy (`vercel-build`).
- On startup in production the site checks its settings and refuses to run if payments, email or the site URL aren't configured (`src/lib/env.ts`).
- Security headers (HSTS, no framing, content-type sniffing off), a health check at `/api/health`, `sitemap.xml`, `robots.txt`, and link previews.
- CI (`.github/workflows/marketplace-ci.yml`) runs typecheck, tests against PostgreSQL, a migrations-vs-schema check, and a production build on every push.

## Not built yet

1. **Sales tax** calculation (see LAUNCH.md).
2. **Password reset by email**: for now an admin resets forgotten passwords.
3. **Partial refunds**: refunding a single item or a goodwill credit is done in the Stripe dashboard.
4. **More notifications**: "delivered" emails and SMS.
5. **Shipping labels**: carrier integration (e.g. Shippo/EasyPost) instead of typing tracking numbers.
6. Reviews, a delivery-date picker, and gift scheduling.
