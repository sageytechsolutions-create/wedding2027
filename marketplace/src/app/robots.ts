import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/vendor", "/account", "/login", "/cart", "/checkout", "/orders", "/track", "/api", "/closed"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
