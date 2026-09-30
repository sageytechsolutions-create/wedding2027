import type { Metadata } from "next";
import Link from "next/link";
import { CartProvider } from "@/components/cart";
import { CartLink } from "@/components/CartLink";
import { site } from "@/lib/config";
import { formatDeliveryDate, localNow } from "@/lib/fulfillment";
import { upcomingHoliday } from "@/lib/jewish-calendar";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "@/lib/auth-actions";
import { currentStoreStatus } from "@/lib/store-hours";
import "./globals.css";

// Store hours and holiday banners depend on the current time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: `${site.name}: kosher favorites delivered nationwide`, template: `%s · ${site.name}` },
  description: site.tagline,
  openGraph: { siteName: site.name, type: "website", title: site.name, description: site.tagline },
  twitter: { card: "summary", title: site.name, description: site.tagline },
};

function Banner() {
  const status = currentStoreStatus();
  if (status.open && status.closesToday) {
    return (
      <div className="bg-stone-900 px-4 py-2 text-center text-sm text-white">
        🕯️ We close for {status.closesToday.reason} today at {status.closesToday.at}. Get your order in!
      </div>
    );
  }
  const holiday = upcomingHoliday(localNow(new Date()).day);
  if (holiday) {
    return (
      <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
        {holiday.name} begins at sundown on {formatDeliveryDate(holiday.erev)}. Choose ⚡ priority delivery at checkout to get your order in time.
      </div>
    );
  }
  return null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, categoryRows] = await Promise.all([
    getCurrentUser(),
    db.product.findMany({ where: { active: true, vendor: { active: true } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  const categories = categoryRows.map((c) => c.category);
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CartProvider>
          <Banner />
          <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
              <Link href="/" className="font-display text-2xl font-bold tracking-tight text-stone-900">
                {site.name.split(" ")[0]} <span className="text-brand">{site.name.split(" ").slice(1).join(" ")}</span>
              </Link>
              <form action="/shop" role="search" className="order-last flex w-full items-center rounded-full border border-stone-300 bg-stone-50 px-4 focus-within:border-stone-900 focus-within:bg-white md:order-none md:w-auto md:flex-1">
                <span aria-hidden className="text-stone-400">⌕</span>
                <label htmlFor="site-search" className="sr-only">Search</label>
                <input id="site-search" name="q" placeholder="Search for food, shops or cities" className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none" />
              </form>
              <nav className="ml-auto flex items-center gap-5 text-sm font-medium md:ml-0">
                <Link href="/vendors" className="hidden hover:text-brand sm:inline">Shops</Link>
                <Link href="/track" className="hidden hover:text-brand sm:inline">Track order</Link>
                <CartLink />
              </nav>
            </div>
            <nav aria-label="Categories" className="border-t border-stone-100">
              <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2.5 text-sm font-medium whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link href="/shop" className="text-stone-900 hover:text-brand">Shop all</Link>
                {categories.map((c) => (
                  <Link key={c} href={`/shop?category=${encodeURIComponent(c)}`} className="text-stone-600 hover:text-brand">{c}</Link>
                ))}
                <Link href="/shop?kosher=passover" className="text-stone-600 hover:text-brand">Kosher for Passover</Link>
                <Link href="/vendors" className="text-stone-600 hover:text-brand">All shops</Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <footer className="mt-16 border-t border-stone-200 py-8 text-sm text-stone-500">
            <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4">
              <div className="space-y-2">
                <p>© {new Date().getFullYear()} {site.legalName}. Shipping nationwide.</p>
                <nav className="flex flex-wrap gap-4">
                  <Link href="/shipping" className="hover:text-brand">Shipping &amp; refunds</Link>
                  <Link href="/terms" className="hover:text-brand">Terms</Link>
                  <Link href="/privacy" className="hover:text-brand">Privacy</Link>
                  <a href={`mailto:${site.supportEmail}`} className="hover:text-brand">Contact us</a>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <Link href={user.role === "admin" ? "/admin" : "/vendor"} className="hover:text-brand">
                      {user.role === "admin" ? "Admin" : "Vendor portal"}
                    </Link>
                    <Link href="/account" className="hover:text-brand">Account</Link>
                    <form action={logout}>
                      <button className="hover:text-brand">Sign out</button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="hover:text-brand">Partner sign in</Link>
                )}
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
