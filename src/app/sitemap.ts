import type { MetadataRoute } from "next";
import { SITE, TOPICS } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { GUIDES_SITEMAP_QUERY } from "@/sanity/queries";
import type { GUIDES_SITEMAP_QUERYResult } from "@/sanity.types";

/**
 * Every public page. The gated ones (/signup, /login, /try) stay out, and so
 * do /lp/* — those are paid-ad landing pages that duplicate the SEO pages on
 * purpose, and a sitemap entry would invite exactly the indexing we block in
 * robots.ts. /resources/* stay out too: they are behind an account, so an
 * indexed entry would send a crawler to a page it cannot read.
 *
 * `lastModified` is per-page and honest. A sitemap that stamps today's date on
 * every URL teaches a crawler to ignore the field, which costs us the one
 * thing it is good for: getting an edited guide re-read quickly. The guide
 * dates now come from Sanity's `updatedAt`, which an editor moves when the
 * content changes — so the honesty is maintained by whoever made the edit
 * rather than by whoever remembered to bump a constant.
 */

/** The site's own last structural change. Bump when pages are added. */
const SITE_UPDATED = new Date("2026-09-11");
/** Topic pages change when the bank does. */
const BANK_UPDATED = new Date("2026-08-01");

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await sanityFetch<GUIDES_SITEMAP_QUERYResult>(
    GUIDES_SITEMAP_QUERY,
    { tags: [tags.guides] },
  );

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
    ...guides.map((g) =>
      at(`/guides/${g.slug}`, 0.7, new Date(`${g.updatedAt}T00:00:00Z`), "monthly"),
    ),
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
