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

```bash
cd marketplace
npm install
cp .env.example .env
npm run setup     # creates the SQLite DB, seeds the launch vendors, and prints demo logins
npm run dev       # http://localhost:3000
npm test          # delivery, Shabbat and holiday rule tests
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

Each email is sent at most once (a vendor toggling the status back and forth doesn't resend). Every email is kept in **Admin → Emails** with a preview, its status, and a Retry button for failures. A failed email never blocks checkout or order updates.

To actually send them, create a [Resend](https://resend.com) account, verify your domain, and set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain) in `.env`. Without a key, emails are saved to the outbox only.

## Turning on Stripe payments

Without keys, checkout runs in demo mode (orders are marked paid, no card is charged).

1. In the Stripe dashboard, enable **Connect** (Express accounts).
2. Put your secret key in `.env` as `STRIPE_SECRET_KEY` (start with `sk_test_…`) and set `SITE_URL`.
3. Add a webhook endpoint at `{SITE_URL}/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`, then put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Each vendor opens their portal and clicks **Connect with Stripe**. Payouts for orders received before they connect are sent when they finish.

## Not built yet (before launch)

1. **Password reset by email**: for now an admin resets forgotten passwords. The sign-in lockout is per server instance; move it to the database or Redis if you run several servers.
2. **Refunds**: cancelling a vendor order doesn't refund the customer or reverse the payout yet; do it in the Stripe dashboard for now.
3. **More notifications**: "delivered" emails, SMS, and password-reset emails.
4. **Shipping labels**: carrier integration (e.g. Shippo/EasyPost for UPS/FedEx overnight) instead of manual tracking entry.
5. **Production DB**: switch the Prisma provider to `postgresql` (Supabase) and make search case-insensitive with `mode: "insensitive"`.
6. Product photo uploads, reviews, a delivery-date picker, and gift scheduling.
