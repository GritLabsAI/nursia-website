import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /* /lp/* are the paid-ad landing pages: they duplicate the SEO pages on
         purpose and must never be indexed against them. AdsBot-Google ignores
         this wildcard rule, so the Google Ads crawler still reaches them. */
      disallow: ["/try", "/signup", "/login", "/lp/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
