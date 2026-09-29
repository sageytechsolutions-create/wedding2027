# KosherValet: multi-vendor kosher food marketplace

A Goldbelly-style marketplace for kosher food. Many certified vendors (delis, bakeries, grills) list
products; a customer buys from any of them in one checkout; each vendor ships their
part of the order themselves.

- **Local next-day delivery** when the customer's ZIP is inside the vendor's delivery area.
- **Overnight shipping nationwide** everywhere else. Perishables ship Mon–Thu only and never the day before Yom Tov, so boxes never sit in a warehouse.
- **Shabbat & Yom Tov**: the whole site closes at 2pm ET on Erev Shabbat / Erev Yom Tov and reopens at 10pm ET after havdalah. Nothing is prepared or delivered on those days. Uses the diaspora calendar from [@hebcal/core](https://github.com/hebcal/hebcal-es6).
- **Priority holiday delivery**: in the two weeks before Yom Tov, customers can pay a per-vendor priority fee. The order is packed first, guaranteed to arrive before the holiday, and local orders placed before 2pm arrive the same day.
- **Kosher info**: vendor hechsher; products marked meat / dairy / pareve, Kosher for Passover, and Glatt, Chassidishe Shechita, Cholov Yisroel, Pas Yisroel, Bishul Yisroel, Yoshon, Non-Gebrokts. Shoppers can filter by all of these.
- **Payments**: Stripe Checkout, with each vendor's share (items minus commission, plus their shipping/priority fees) sent automatically to their Stripe Connect account.

## Run it

```bash
cd marketplace
npm install
cp .env.example .env
npm run setup     # creates the SQLite DB and seeds 5 demo vendors
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

## Turning on Stripe payments

Without keys, checkout runs in demo mode (orders are marked paid, no card is charged).

1. In the Stripe dashboard, enable **Connect** (Express accounts).
2. Put your secret key in `.env` as `STRIPE_SECRET_KEY` (start with `sk_test_…`) and set `SITE_URL`.
3. Add a webhook endpoint at `{SITE_URL}/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`, then put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Each vendor opens their portal and clicks **Connect with Stripe**. Payouts for orders received before they connect are sent when they finish.

## Not built yet (before launch)

1. **Logins**: vendor and admin pages are open. Add auth (e.g. Supabase Auth) and restrict each vendor to their own data.
2. **Refunds**: cancelling a vendor order doesn't refund the customer or reverse the payout yet; do it in the Stripe dashboard for now.
3. **Emails/SMS**: order confirmation, shipped and delivered notifications.
4. **Shipping labels**: carrier integration (e.g. Shippo/EasyPost for UPS/FedEx overnight) instead of manual tracking entry.
5. **Production DB**: switch the Prisma provider to `postgresql` (Supabase) and make search case-insensitive with `mode: "insensitive"`.
6. Product photo uploads, reviews, a delivery-date picker, and gift scheduling.
