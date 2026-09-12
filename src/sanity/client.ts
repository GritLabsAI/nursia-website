import { createClient } from "next-sanity";

/**
 * The read side of the content lake.
 *
 * Deliberately *not* `defineLive`. Live Content is the right default for a
 * site where an editor wants to watch a change appear as they type, and it
 * pays for that with a client component in the root layout and a websocket on
 * every page. These are SEO pages: they are prerendered, they are served to a
 * crawler far more often than to an editor, and the thing that matters is that
 * the HTML arrives complete and fast. So the pages are static, and an edit
 * reaches them through the webhook in /api/revalidate — seconds, not a deploy,
 * and nothing extra shipped to the reader.
 *
 * `useCdn` is on for reads and deliberately off for `generateStaticParams`,
 * which runs at build time and must not miss a guide published ninety seconds
 * ago (see `buildClient`).
 */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-02-01";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
  /*
   * Authenticate the reads, even though the dataset is public and none of this
   * needs permission to read.
   *
   * A production build prerenders ~1,700 pages across as many workers as the
   * builder has cores, and each page costs two queries — one in
   * generateMetadata, one in the page body. That is several thousand requests
   * in a few minutes from a SINGLE build IP, and it is what killed the deploy
   * on 2026-09-12: HTTP 429 with `sanity-ratelimit-applied: ip`. Anonymous
   * reads share a per-IP bucket; authenticated ones are counted against the
   * project's own, much larger allowance.
   *
   * Retrying was NOT the missing piece and is not what this fixes.
   * @sanity/client already retries a 429 five times with exponential backoff
   * by default, and the build failed anyway — the throttling is sustained for
   * the length of the export, not a momentary burst.
   *
   * Safe alongside `useCdn` and a public dataset because `perspective` is
   * "published": a token cannot widen what these queries return, so a cached
   * CDN response still cannot contain a draft. And it cannot reach a browser —
   * every importer of this module is a server component, and the variable is
   * deliberately not NEXT_PUBLIC_.
   *
   * Optional by design: unset, this is `undefined` and the client behaves
   * exactly as it did before, so a missing token degrades to the old rate
   * limit rather than breaking the build.
   */
  token: process.env.SANITY_API_READ_TOKEN,
});

/** Bypasses the CDN. For build-time reads, where fresh beats fast. */
export const buildClient = client.withConfig({ useCdn: false });

/**
 * Cache tags.
 *
 * Everything on a guide page — the guide, the resource it gates, the
 * experiment running on it, the author's credentials — can change without the
 * guide document itself being touched. Tagging by *type* as well as by slug is
 * what makes "rename the author's credential" reach all forty pages instead of
 * none, and it is why the webhook in /api/revalidate sends both.
 */
export const tags = {
  guide: (slug: string) => `guide:${slug}`,
  guides: "guide",
  seoPage: (slug: string) => `seoPage:${slug}`,
  seoPages: "seoPage",
  nursingPage: (slug: string) => `nursingPage:${slug}`,
  nursingPages: "nursingPage",
  topic: (slug: string) => `topic:${slug}`,
  topics: "topic",
  leadMagnets: "leadMagnet",
  experiments: "experiment",
  authors: "author",
} as const;

/** Everything a guide page depends on, in one list. */
export const GUIDE_PAGE_TAGS = [
  tags.guides,
  tags.topics,
  tags.leadMagnets,
  tags.experiments,
  tags.authors,
];

/**
 * The same list for a review page, plus the guides it links out to.
 *
 * `tags.guides` is in here because a review page renders the titles of the
 * guides in its related-reading rail. Retitle a guide and, without this, the
 * old title keeps appearing on a hundred review pages until something else
 * happens to rebuild them.
 */
export const SEO_PAGE_TAGS = [
  tags.seoPages,
  tags.guides,
  tags.topics,
  tags.leadMagnets,
  tags.experiments,
  tags.authors,
];

/**
 * The same again for a nursing library page.
 *
 * `tags.nursingPages` as well as the per-slug tag, because these pages render
 * each other: every page carries a rail of four siblings by title, so editing
 * one page's title changes the text on four others. Without the type tag those
 * four keep the old title until something unrelated rebuilds them, and at a
 * thousand pages "something unrelated" may not happen for weeks.
 */
export const NURSING_PAGE_TAGS = [
  tags.nursingPages,
  tags.guides,
  tags.topics,
  tags.leadMagnets,
  tags.experiments,
  tags.authors,
];

type FetchOptions = {
  params?: Record<string, unknown>;
  /** Tags that invalidate this read. Prefer these over a short revalidate. */
  tags?: string[];
  /**
   * Seconds. Only a backstop for the case where the webhook never fires —
   * a misconfigured secret, a deleted hook — so an hour is right and a minute
   * is somebody not trusting the webhook they just built.
   */
  revalidate?: number;
};

export async function sanityFetch<T>(
  query: string,
  { params = {}, tags: cacheTags = [], revalidate = 3600 }: FetchOptions = {},
): Promise<T> {
  return client.fetch<T>(query, params, {
    next: { revalidate, tags: cacheTags },
  });
}
