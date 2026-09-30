import { NextResponse, type NextRequest } from "next/server";
import { currentStoreStatus } from "@/lib/store-hours";

// The whole site goes dark from Erev Shabbat / Erev Yom Tov at 2pm until after havdalah.
export function middleware(req: NextRequest) {
  const status = currentStoreStatus();
  if (status.open) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: `Closed for ${status.reason}. We reopen ${status.reopens}.` }, { status: 503 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/closed";
  url.search = "";
  return NextResponse.rewrite(url, { status: 503 });
}

export const config = {
  // Stripe must still be able to confirm payments that finish right at closing time.
  // The health check stays up so monitoring doesn't page anyone on Shabbat.
  matcher: ["/((?!_next/|closed|api/stripe/webhook|api/health|favicon.ico).*)"],
};
