import type { MetadataRoute } from "next";
import { GUIDES, SITE, TOPICS, guideModified } from "@/lib/content";

/**
 * Every public page. The gated ones (/signup, /login, /try) stay out, and so
 * do /lp/* — those are paid-ad landing pages that duplicate the SEO pages on
 * purpose, and a sitemap entry would invite exactly the indexing we block in
 * robots.ts.
 *
 * `lastModified` is per-page and honest. A sitemap that stamps today's date on
 * every URL teaches a crawler to ignore the field, which costs us the one
 * thing it is good for: getting an edited guide re-read quickly.
 */

/** The site's own last structural change. Bump when pages are added. */
const SITE_UPDATED = new Date("2026-08-27");
/** Topic pages change when the bank does. */
const BANK_UPDATED = new Date("2026-08-01");

export default function sitemap(): MetadataRoute.Sitemap {
  const at = (
    path: string,
    priority: number,
    lastModified: Date = SITE_UPDATED,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly",
  ) => ({ url: `${SITE.url}${path}`, lastModified, priority, changeFrequency });

  return [
    at("/", 1, SITE_UPDATED, "weekly"),

    /* Practice — the money pages */
    at("/nclex-practice-questions", 0.9, BANK_UPDATED, "weekly"),
    at("/practice", 0.9, BANK_UPDATED, "weekly"),
    ...TOPICS.map((t) => at(`/nclex-practice-questions/${t.slug}`, 0.8, BANK_UPDATED, "weekly")),

    /* Editorial */
    at("/guides", 0.8, SITE_UPDATED, "weekly"),
    ...GUIDES.map((g) => at(`/guides/${g.slug}`, 0.7, new Date(guideModified(g)), "monthly")),
    at("/nclex", 0.6),

    /* Commercial and trust */
    at("/pricing", 0.7),
    at("/about", 0.5),
    at("/contact", 0.4, SITE_UPDATED, "yearly"),
    at("/refunds", 0.3, SITE_UPDATED, "yearly"),
    at("/terms", 0.2, SITE_UPDATED, "yearly"),
    at("/privacy", 0.2, SITE_UPDATED, "yearly"),
  ];
}
