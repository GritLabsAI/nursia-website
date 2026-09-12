import type { MetadataRoute } from "next";
import { SITE, TOPICS } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { GUIDES_SITEMAP_QUERY, SEO_PAGES_SITEMAP_QUERY } from "@/sanity/queries";
import { NURSING_SITEMAP_QUERY } from "@/sanity/nursing-queries";
import type {
  GUIDES_SITEMAP_QUERY_RESULT,
  NURSING_SITEMAP_QUERY_RESULT,
  SEO_PAGES_SITEMAP_QUERY_RESULT,
} from "@/sanity.types";

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
  const [guides, reviews, nursing] = await Promise.all([
    sanityFetch<GUIDES_SITEMAP_QUERY_RESULT>(GUIDES_SITEMAP_QUERY, {
      tags: [tags.guides],
    }),
    sanityFetch<SEO_PAGES_SITEMAP_QUERY_RESULT>(SEO_PAGES_SITEMAP_QUERY, {
      tags: [tags.seoPages],
    }),
    sanityFetch<NURSING_SITEMAP_QUERY_RESULT>(NURSING_SITEMAP_QUERY, {
      tags: [tags.nursingPages],
    }),
  ]);

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
    /* The review programme. Lower priority than the guides deliberately: these
       are a wider, shallower net, and telling a crawler that a hundred new
       pages matter as much as the hand-written library is how the library's
       own priority stops meaning anything. */
    at("/nclex-review", 0.8, SITE_UPDATED, "weekly"),
    ...reviews.map((p) =>
      at(`/nclex-review/${p.slug}`, 0.6, new Date(`${p.updatedAt}T00:00:00Z`), "monthly"),
    ),

    /*
     * The nursing library — the long tail, and the largest thing in here.
     *
     * The hub is 0.8 because it is the page every one of these is reachable
     * from, and a crawler that reads one URL from this section should read
     * that one. The pages themselves sit at 0.5, below the review programme,
     * which is below the guides. That ordering is the honest one: priority is
     * relative within a sitemap and means nothing in absolute terms, so the
     * only useful thing it can say is which of our own pages we would rather
     * have crawled first. Telling a crawler a thousand programmatic pages
     * matter as much as fifty hand-written ones does not raise the thousand,
     * it flattens the signal for all of them.
     *
     * `noIndex` pages are already excluded by the query rather than filtered
     * here, because a URL that is in the sitemap and carries a noindex tag is
     * a contradiction a crawler resolves by trusting neither.
     */
    at("/nursing", 0.8, SITE_UPDATED, "weekly"),
    ...nursing.map((p) =>
      at(`/nursing/${p.slug}`, 0.5, new Date(`${p.updatedAt}T00:00:00Z`), "monthly"),
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
