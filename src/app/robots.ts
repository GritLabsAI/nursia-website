import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/try", "/signup", "/login"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
