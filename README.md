# Table Nine

Wedding planning app — guest list and RSVP, budget, vendors, seating floor plan,
and the day-of schedule.

Stack: React 18 + Vite. No backend required to run.

## Run locally

    npm install
    npm run dev

## Deploy to Vercel

Option A — dashboard:

1. Push this folder to a new GitHub repo.
2. vercel.com → Add New → Project → import the repo.
3. Vercel detects Vite automatically. Framework: Vite. Build: `npm run build`.
   Output: `dist`. Leave the defaults alone.
4. Deploy.

Option B — CLI:

    npm i -g vercel
    vercel login
    vercel --prod

Both take about two minutes. No environment variables are needed for the
current build.

## Data

Everything persists to `localStorage` in the browser, through the `db` object
at the top of `src/App.jsx`. That is fine for a demo or a single couple, but it
is per-device and per-browser.

To make it a real product, swap the two methods in `db` for Supabase calls. The
exact code and the SQL for the table and its row-level security policy are in a
comment block directly above `db`. Nothing else in the file touches storage, so
that is the only edit.

After that you will want, in rough order:

1. Supabase Auth — email magic link is enough to start.
2. Stripe Checkout + a `subscriptions` table for billing.
3. A public RSVP page: a per-wedding slug that writes to the guests row without
   requiring the guest to have an account.

## Files

    index.html          entry
    src/main.jsx        React mount
    src/index.css       page background only; all app styles live in App.jsx
    src/App.jsx         the entire application
