# Hometown Table: multi-vendor food marketplace

A Goldbelly-style marketplace. Many vendors (restaurants, bakeries, smokehouses) list
products; a customer buys from any of them in one checkout; each vendor ships their
part of the order themselves.

- **Local next-day delivery** when the customer's ZIP is inside the vendor's delivery area.
- **Overnight shipping nationwide** everywhere else. Perishables ship Mon–Thu only so boxes never sit over a weekend.

## Run it

```bash
cd marketplace
npm install
cp .env.example .env
npm run setup     # creates the SQLite DB and seeds 6 demo vendors
npm run dev       # http://localhost:3000
npm test          # delivery-rule unit tests
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

## Not built yet (before launch)

1. **Payments**: Stripe Connect, so each vendor is paid out automatically minus commission. Checkout is currently in demo mode.
2. **Logins**: vendor and admin pages are open. Add auth (e.g. Supabase Auth) and restrict each vendor to their own data.
3. **Emails/SMS**: order confirmation, shipped and delivered notifications.
4. **Shipping labels**: carrier integration (e.g. Shippo/EasyPost for UPS/FedEx overnight) instead of manual tracking entry.
5. **Production DB**: switch the Prisma provider to `postgresql` (Supabase) and make search case-insensitive with `mode: "insensitive"`.
6. Product photo uploads, reviews, a delivery-date picker, and gift scheduling.
