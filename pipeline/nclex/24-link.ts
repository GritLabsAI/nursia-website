/**
 * Stage 24 — wire the new pages into the site, in both directions.
 *
 * A hundred pages published with no internal links is a hundred pages reachable
 * only through the sitemap. They get crawled late, re-crawled later, and
 * inherit none of the authority the rest of the site has spent two years
 * accumulating. Left like that, the honest description of this programme is
 * "an island next to the site" rather than "part of it".
 *
 * Three passes, and the third is the one that matters most:
 *
 *   1. **review → review.** Up to three siblings in the same test plan
 *      category, so the new cluster has internal structure rather than being a
 *      hundred leaves hanging off one hub.
 *   2. **review → guide.** Up to two guides on the same question topic. These
 *      links cost the new page nothing it needs and give the guides — which
 *      already rank — a little more relevance for the subject.
 *   3. **guide → review.** Up to two review pages on the guide's own topic.
 *      This is the backlink that actually does the work: the link a crawler
 *      follows from a page it already trusts into one it has never seen. The
 *      first two passes make the cluster navigable; this one gets it indexed.
 *
 * Targets are chosen **fewest-inbound-first** throughout. Linking is a budget,
 * and spending it on the pages that already have links is how a programme ends
 * up with ten well-linked pages and ninety orphans.
 *
 * Every link is recorded in the local `link` table with the rule that chose it,
 * so a bad automatic link can be found and explained rather than wondered at.
 *
 *   npm run nclex:link
 *   npm run nclex:link -- --dry
 *   npm run nclex:link -- --reassign   # redo pages that already have links
 */

import { key, writeClient } from "../lib/sanity";
import { openStore, type LinkRow } from "./lib/store";

const DRY = process.argv.includes("--dry");
const REASSIGN = process.argv.includes("--reassign");

/** What the schemas allow, and what is actually useful on the page. */
const MAX_READ_NEXT = 3;
const MAX_RELATED_GUIDES = 2;
const MAX_RELATED_REVIEWS = 2;

type Review = {
  _id: string;
  slug: string;
  title: string;
  examCategory: string | null;
  cluster: string | null;
  topic: string | null;
  readNext: string[] | null;
  relatedGuides: string[] | null;
};

type Guide = {
  _id: string;
  slug: string;
  title: string;
  cluster: string | null;
  topic: string | null;
  relatedReviews: string[] | null;
};

async function main() {
  const store = openStore();
  const client = writeClient();

  try {
    const reviews = await client.fetch<Review[]>(`*[_type == "seoPage"]{
      _id,
      "slug": slug.current,
      title,
      examCategory,
      cluster,
      "topic": topic->slug.current,
      "readNext": readNext[]->slug.current,
      "relatedGuides": relatedGuides[]->slug.current
    }`);

    const guides = await client.fetch<Guide[]>(`*[_type == "guide"]{
      _id,
      "slug": slug.current,
      title,
      cluster,
      "topic": topic->slug.current,
      "relatedReviews": relatedReviews[]->slug.current
    }`);

    if (!reviews.length) {
      console.log(`\nNo review pages in the dataset. Run \`npm run nclex:publish\` first.\n`);
      return;
    }

    console.log(`\nLink`);
    console.log(`  review pages  ${reviews.length}`);
    console.log(`  guides        ${guides.length}`);

    /* Inbound counts start from what is already published, not from zero, so a
       second run adds links where they are thin rather than redistributing the
       ones that exist. */
    const inbound = new Map<string, number>(reviews.map((r) => [r.slug, 0]));
    const bump = (slug: string) => inbound.set(slug, (inbound.get(slug) ?? 0) + 1);
    for (const r of reviews) for (const to of r.readNext ?? []) bump(to);
    for (const g of guides) for (const to of g.relatedReviews ?? []) bump(to);

    const links: LinkRow[] = [];
    const now = new Date().toISOString();
    const record = (
      fromSlug: string,
      fromType: string,
      toSlug: string,
      toType: string,
      rule: string,
    ) => links.push({ fromSlug, fromType, toSlug, toType, rule, createdAt: now });

    /* ------------------------------------------- 1. review → review */

    const patches: { id: string; set: Record<string, unknown>; label: string }[] = [];
    let readNextWritten = 0;

    for (const r of reviews) {
      if (r.readNext?.length && !REASSIGN) continue;

      /* Same category first, then the same question topic, then anything in the
         same journey cluster. Category before topic because the reader is
         revising a section of the test plan, and "what else is in this section"
         is the question they are about to ask. */
      const candidates = reviews
        .filter((other) => other.slug !== r.slug)
        .map((other) => ({
          other,
          rank:
            other.examCategory === r.examCategory
              ? 0
              : other.topic === r.topic
                ? 1
                : other.cluster === r.cluster
                  ? 2
                  : 3,
        }))
        .filter((c) => c.rank < 3)
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            (inbound.get(a.other.slug) ?? 0) - (inbound.get(b.other.slug) ?? 0) ||
            a.other.slug.localeCompare(b.other.slug),
        )
        .slice(0, MAX_READ_NEXT);

      if (!candidates.length) continue;

      for (const c of candidates) {
        bump(c.other.slug);
        record(
          r.slug,
          "seoPage",
          c.other.slug,
          "seoPage",
          ["same-category", "same-topic", "same-cluster"][c.rank],
        );
      }

      patches.push({
        id: r._id,
        set: {
          readNext: candidates.map((c) => ({
            _type: "reference",
            _ref: c.other._id,
            _key: key(),
          })),
        },
        label: `${r.slug} → ${candidates.map((c) => c.other.slug).join(", ")}`,
      });
      readNextWritten++;
    }

    /* -------------------------------------------- 2. review → guide */

    let relatedGuidesWritten = 0;
    for (const r of reviews) {
      if (r.relatedGuides?.length && !REASSIGN) continue;

      const candidates = guides
        .filter((g) => g.topic === r.topic)
        .slice(0, MAX_RELATED_GUIDES);
      /* No fallback to "any guide". A guide on a different subject in the same
         cluster is not related reading, it is a link for the sake of a link,
         and the rail is better empty than wrong. */
      if (!candidates.length) continue;

      for (const g of candidates) {
        record(r.slug, "seoPage", g.slug, "guide", "same-topic");
      }

      patches.push({
        id: r._id,
        set: {
          relatedGuides: candidates.map((g) => ({
            _type: "reference",
            _ref: g._id,
            _key: key(),
          })),
        },
        label: `${r.slug} → guides: ${candidates.map((g) => g.slug).join(", ")}`,
      });
      relatedGuidesWritten++;
    }

    /* -------------------------------------------- 3. guide → review */

    let backlinksWritten = 0;
    for (const g of guides) {
      if (g.relatedReviews?.length && !REASSIGN) continue;

      const candidates = reviews
        .filter((r) => r.topic === g.topic)
        .sort(
          (a, b) =>
            (inbound.get(a.slug) ?? 0) - (inbound.get(b.slug) ?? 0) ||
            a.slug.localeCompare(b.slug),
        )
        .slice(0, MAX_RELATED_REVIEWS);
      if (!candidates.length) continue;

      for (const r of candidates) {
        bump(r.slug);
        record(g.slug, "guide", r.slug, "seoPage", "same-topic");
      }

      patches.push({
        id: g._id,
        set: {
          relatedReviews: candidates.map((r) => ({
            _type: "reference",
            _ref: r._id,
            _key: key(),
          })),
        },
        label: `${g.slug} → reviews: ${candidates.map((r) => r.slug).join(", ")}`,
      });
      backlinksWritten++;
    }

    /* ----------------------------------------------------- the report */

    console.log(`\n  read-next     ${readNextWritten} review pages wired to siblings`);
    console.log(`  out to guides ${relatedGuidesWritten} review pages`);
    console.log(`  backlinks     ${backlinksWritten} guides now point at a review page`);

    const orphans = reviews.filter((r) => (inbound.get(r.slug) ?? 0) === 0);
    if (orphans.length) {
      /*
       * Reported rather than forced. An orphan at this point means no other page
       * shares its category, its topic or its cluster, which is a fact about the
       * plan rather than about the linker — and the fix is another page in that
       * category, not a link from an unrelated one. The hub still lists it, so
       * it is reachable; it just is not well connected.
       */
      console.log(`\n  ! ${orphans.length} page(s) with no inbound link from another page:`);
      for (const o of orphans.slice(0, 10)) {
        console.log(`      ${o.slug}  (${o.examCategory ?? "no category"})`);
      }
    }

    const worst = [...inbound.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);
    console.log(`\n  Thinnest inbound`);
    for (const [slug, n] of worst) console.log(`    ${String(n).padStart(2)}  ${slug}`);

    if (DRY) {
      console.log(`\n  Would write ${patches.length} patch(es):`);
      for (const p of patches.slice(0, 12)) console.log(`    ${p.label}`);
      if (patches.length > 12) console.log(`    …and ${patches.length - 12} more`);
      console.log(`\n  --dry, nothing written\n`);
      return;
    }

    for (const p of patches) {
      await client.patch(p.id).set(p.set).commit();
    }
    store.putLinks(links);

    console.log(`\n  ${patches.length} document(s) patched, ${links.length} link(s) recorded`);
    console.log(`  stored        ${JSON.stringify(store.counts())}`);
    console.log(`\n  Next: npm run nclex:audit\n`);
  } finally {
    store.close();
  }
}

main().catch((err) => {
  console.error(`\nLinking failed: ${err.message}\n`);
  process.exit(1);
});
