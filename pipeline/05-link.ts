/**
 * Stage 5 — make sure nothing is stranded.
 *
 * A guide with no inbound links is a page a crawler reaches only through the
 * sitemap, and one a reader reaches only from a search result. It ranks slower,
 * it recovers from a re-crawl slower, and it receives none of the authority the
 * rest of the cluster has accumulated. Stage 4 reports them; this fixes them.
 *
 * The fix is always to edit the *linking* guide, never the orphan. Adding
 * outbound links to a stranded page does nothing for it — links carry value in
 * one direction, and the page needs to be pointed at.
 *
 * Two ways a link gets chosen. An explicit map, for the pages where a human
 * knows which guides ought to mention a new one — that is editorial judgement
 * and a scoring function should not be asked to reproduce it. Then affinity,
 * for everything else: same cluster and same question topic first, then either.
 * Affinity is a reasonable default and it is visibly worse than the map, which
 * is why the map exists and why the script prints which rule it used.
 *
 * Appends rather than replaces, and respects the schema's limit of four, so a
 * hand-curated "read next" is never silently rewritten by a later run.
 *
 *   npm run seo:link
 *   npm run seo:link -- --dry
 */

import { key, writeClient } from "./lib/sanity";

const DRY = process.argv.includes("--dry");

/** Schema allows four. Leaving headroom means a later run is not locked out. */
const MAX_READ_NEXT = 4;
/** Inbound links to give an orphan. Two is enough to be crawled promptly. */
const TARGET_INBOUND = 2;

/**
 * Where a human knows better.
 *
 * Keyed by the orphan; the values are the guides that should point at it. These
 * are the editorial calls for this run's five new pages — the guides whose
 * readers would genuinely want the new one next, which is not the same question
 * as which guides are topically nearest.
 */
const EDITORIAL: Record<string, string[]> = {
  "nurse-licensure-compact-states": [
    "reading-your-result",
    "nclex-results-timeline",
    "choosing-a-state-board-for-nclex",
  ],
  "hesi-exit-exam-nclex-prediction": [
    "how-many-practice-questions-before-nclex",
    "how-hard-is-the-nclex",
  ],
  "using-chatgpt-to-study-for-the-nclex": [
    "how-many-practice-questions-before-nclex",
    "two-week-nclex-study-plan",
  ],
  "nclex-for-nigerian-nurses": [
    "nclex-for-internationally-educated-nurses",
    "credentials-evaluation-for-nclex",
  ],
  "nclex-testing-accommodations": [
    "how-to-register-for-the-nclex",
    "test-day-checklist",
  ],
};

type Guide = {
  _id: string;
  slug: string;
  title: string;
  cluster: string | null;
  topic: string | null;
  inbound: number;
  readNext: string[] | null;
};

async function main() {
  const client = writeClient();

  const guides = await client.fetch<Guide[]>(`*[_type == "guide"]{
    _id,
    "slug": slug.current,
    title,
    cluster,
    "topic": topic->slug.current,
    "inbound": count(*[_type == "guide" && references(^._id)]),
    "readNext": readNext[]->slug.current
  }`);

  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  /* Mutated as we go, so two orphans do not both get bolted onto the same
     already-full guide within a single run. */
  const links = new Map(guides.map((g) => [g.slug, [...(g.readNext ?? [])]]));
  const inbound = new Map(guides.map((g) => [g.slug, g.inbound]));

  const orphans = guides
    .filter((g) => (inbound.get(g.slug) ?? 0) === 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  console.log(`\nInternal linking${DRY ? " — DRY RUN" : ""}`);
  console.log(`  ${orphans.length} of ${guides.length} guides have no inbound links\n`);

  if (!orphans.length) {
    console.log("  Nothing stranded.\n");
    return;
  }

  const patches = new Map<string, string[]>();

  for (const orphan of orphans) {
    const chosen: { slug: string; why: string }[] = [];

    const canLink = (slug: string) => {
      const candidate = bySlug.get(slug);
      if (!candidate || slug === orphan.slug) return false;
      const current = links.get(slug) ?? [];
      if (current.length >= MAX_READ_NEXT) return false;
      if (current.includes(orphan.slug)) return false;
      return true;
    };

    /* Is this link reciprocal — does the orphan already point back? Worth
       mildly avoiding so the links spread rather than forming pairs, but only
       mildly: two closely related guides pointing at each other is ordinary
       and useful, and treating it as disqualifying was a mistake. It vetoed
       every editorial choice in this file, because of course the guide a human
       picked to link *to* a new page is usually one the new page links *from*. */
    const reciprocal = (slug: string) =>
      (links.get(orphan.slug) ?? []).includes(slug);

    for (const slug of EDITORIAL[orphan.slug] ?? []) {
      if (chosen.length >= TARGET_INBOUND) break;
      if (canLink(slug)) chosen.push({ slug, why: "editorial" });
    }

    if (chosen.length < TARGET_INBOUND) {
      const scored = guides
        .filter((g) => canLink(g.slug) && !chosen.some((c) => c.slug === g.slug))
        .map((g) => {
          let score = 0;
          if (g.cluster === orphan.cluster) score += 2;
          if (g.topic && g.topic === orphan.topic) score += 3;
          /* Prefer a guide with room left, so the links spread across the
             cluster instead of piling four onto one popular page. */
          score += MAX_READ_NEXT - (links.get(g.slug)?.length ?? 0);
          if (reciprocal(g.slug)) score -= 2;
          return { g, score };
        })
        .filter((s) => s.score > 1)
        .sort((a, b) => b.score - a.score || a.g.slug.localeCompare(b.g.slug));

      for (const { g } of scored) {
        if (chosen.length >= TARGET_INBOUND) break;
        chosen.push({ slug: g.slug, why: "affinity" });
      }
    }

    if (!chosen.length) {
      console.log(`  ! ${orphan.slug}: no guide has room to link to it`);
      continue;
    }

    console.log(`  ${orphan.slug}`);
    for (const c of chosen) {
      console.log(`      ← ${c.slug} (${c.why})`);
      links.get(c.slug)!.push(orphan.slug);
      patches.set(c.slug, links.get(c.slug)!);
      inbound.set(orphan.slug, (inbound.get(orphan.slug) ?? 0) + 1);
    }
  }

  if (DRY) {
    console.log(`\n  Would edit ${patches.size} guides.\n`);
    return;
  }

  for (const [slug, slugs] of patches) {
    const refs = slugs
      .map((s) => bySlug.get(s)?._id)
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ _type: "reference", _ref: id, _key: key() }));
    await client.patch(bySlug.get(slug)!._id).set({ readNext: refs }).commit();
  }

  console.log(`\n  Edited ${patches.size} guides.\n`);
}

main().catch((err) => {
  console.error(`\nLinking failed: ${err.message}\n`);
  process.exit(1);
});
