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
