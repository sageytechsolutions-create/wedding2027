import type { Metadata } from "next";
import Link from "next/link";
import { CartProvider } from "@/components/cart";
import { CartLink } from "@/components/CartLink";
import { site } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CartProvider>
          <header className="sticky top-0 z-10 border-b border-stone-200 bg-cream/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <Link href="/" className="font-display text-2xl font-bold text-brand">{site.name}</Link>
              <nav className="flex items-center gap-5 text-sm font-medium">
                <Link href="/shop" className="hover:text-brand">Shop</Link>
                <Link href="/vendors" className="hover:text-brand">Vendors</Link>
                <Link href="/track" className="hidden hover:text-brand sm:inline">Track order</Link>
                <CartLink />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mt-16 border-t border-stone-200 py-8 text-sm text-stone-500">
            <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4">
              <p>© {new Date().getFullYear()} {site.name}. Shipping nationwide.</p>
              <div className="flex gap-4">
                <Link href="/vendor" className="hover:text-brand">Vendor portal</Link>
                <Link href="/admin" className="hover:text-brand">Admin</Link>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
