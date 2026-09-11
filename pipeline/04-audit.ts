/**
 * Stage 4 — check the library is actually doing its two jobs.
 *
 * Runs against Sanity and reports on what a content programme quietly loses if
 * nobody looks: pages that rank and collect nothing, pages nothing links to,
 * pages competing with each other for the same query, and pages that have gone
 * stale. None of these show up as errors. Every one of them looks like a
 * finished page from every angle except this one.
 *
 * Exits non-zero when something is broken rather than merely untidy, so it can
 * gate a deploy. The distinction is deliberate:
 *
 *   ERROR   the page is wrong or unreachable — a missing topic, a dangling
 *           reference, a duplicate slug. Fix before shipping.
 *   WARN    the page works and is underperforming — no resource, no inbound
 *           links, going stale. Worth a morning, not a rollback.
 *
 * Run it after every pipeline run, and on a schedule afterwards. The stale
 * check in particular only becomes useful months later, which is exactly when
 * nobody thinks to look.
 *
 *   npm run seo:audit
 */

import { writeClient } from "./lib/sanity";

/** Six months. Long enough not to nag, short enough that a changed fee surfaces. */
const STALE_DAYS = 182;
/** Below this a guide reads as a stub to a person and to a crawler. */
const THIN_SECTIONS = 3;
/*
 * Calibrated against the library rather than picked round, because a threshold
 * that flags thirty of fifty pages is not a signal, it is noise that gets
 * ignored and then gets deleted. Measured over every guide, whole-page prose
 * runs from about 240 words upward; the house style is short and dense on
 * purpose. 300 flags the handful of genuine stubs — the original hub-style
 * entries — and leaves the rest alone.
 */
const THIN_WORDS = 300;

type GuideAudit = {
  _id: string;
  slug: string | null;
  title: string;
  cluster: string | null;
  updatedAt: string | null;
  topic: string | null;
  resource: string | null;
  experiment: string | null;
  sectionCount: number;
  spans: string[] | null;
  shortAnswer: string | null;
  faqText: string[] | null;
  outbound: number;
  inbound: number;
  primaryQuery: string | null;
  noIndex: boolean | null;
};

async function main() {
  const client = writeClient();

  /*
   * On `spans`: the pt::text function looks like the right way to get a word
   * count and is not. `sections[].body` is an array *of arrays* of blocks and
   * pt::text does not flatten that, so it silently returns a fraction of the
   * page — with it, every guide in the library reported as thin, including
   * ones over a thousand words. Pulling the spans and counting them in
   * JavaScript is duller and correct.
   *
   * (Comments live out here because GROQ has no block-comment syntax, and a
   * backtick inside one would end the template literal anyway.)
   */
  const guides = await client.fetch<GuideAudit[]>(`*[_type == "guide"]{
    _id,
    "slug": slug.current,
    title,
    cluster,
    updatedAt,
    "topic": topic->slug.current,
    "resource": leadMagnet->slug.current,
    "experiment": experiment->key.current,
    "sectionCount": count(sections),
    "spans": sections[].body[].children[].text,
    shortAnswer,
    "faqText": faqs[].q + faqs[].a,
    "outbound": count(readNext),
    "inbound": count(*[_type == "guide" && references(^._id)]),
    "primaryQuery": research.primaryQuery,
    "noIndex": seo.noIndex
  } | order(slug asc)`);

  const errors: string[] = [];
  const warnings: string[] = [];

  const cutoff = new Date(Date.now() - STALE_DAYS * 864e5).toISOString().slice(0, 10);
  const bySlug = new Map<string, number>();
  const byQuery = new Map<string, string[]>();

  for (const g of guides) {
    const name = g.slug ?? g.title ?? g._id;
    /* Every word on the page, not just the section bodies. The short answer is
       the most-read sixty words on a guide and the FAQs are visible copy, so
       leaving either out understates a page by a third and makes the threshold
       meaningless. */
    const words = [
      g.shortAnswer ?? "",
      ...(g.spans ?? []),
      ...(g.faqText ?? []),
    ].reduce(
      (n, text) => n + (text?.trim().split(/\s+/).filter(Boolean).length ?? 0),
      0,
    );

    /* --- errors: the page is wrong --------------------------------------- */
    if (!g.slug) errors.push(`${g.title}: no slug — the page has no URL`);
    if (!g.topic)
      errors.push(`${name}: no question topic — the guide links to no practice`);
    if (!g.updatedAt) errors.push(`${name}: no updatedAt — sitemap lastmod will be wrong`);
    if (g.sectionCount < 2) errors.push(`${name}: ${g.sectionCount} section(s)`);

    if (g.slug) bySlug.set(g.slug, (bySlug.get(g.slug) ?? 0) + 1);

    /* --- warnings: the page underperforms -------------------------------- */
    if (!g.resource)
      warnings.push(`${name}: no free resource — this page collects nobody`);
    if (!g.experiment && g.resource)
      warnings.push(`${name}: has a resource but is in no experiment`);
    if (g.inbound === 0 && !g.noIndex)
      warnings.push(`${name}: orphaned — no other guide reads next to it`);
    if (g.outbound === 0) warnings.push(`${name}: links to no other guide`);
    if (g.updatedAt && g.updatedAt < cutoff)
      warnings.push(`${name}: not updated since ${g.updatedAt}`);
    if (g.sectionCount >= 2 && g.sectionCount < THIN_SECTIONS)
      warnings.push(`${name}: only ${g.sectionCount} sections`);
    if (words < THIN_WORDS)
      warnings.push(`${name}: roughly ${words} words — thin`);

    /* Two guides aiming at one query is the failure stage 2 exists to
       prevent. It can still arrive through the Studio, where nobody runs a
       dedupe, so it is worth catching on the way out as well as on the way in. */
    if (g.primaryQuery) {
      const key = g.primaryQuery.toLowerCase().trim();
      byQuery.set(key, [...(byQuery.get(key) ?? []), name]);
    }
  }

  for (const [slug, n] of bySlug) {
    if (n > 1) errors.push(`${slug}: ${n} guides share this slug`);
  }
  for (const [query, names] of byQuery) {
    if (names.length > 1) {
      warnings.push(
        `"${query}" is the target query of ${names.length} guides (${names.join(", ")}) — they will compete`,
      );
    }
  }

  /* ------------------------------------------------------------- the shape */

  const withResource = guides.filter((g) => g.resource).length;
  const inExperiment = guides.filter((g) => g.experiment).length;

  const resourceCounts = new Map<string, number>();
  for (const g of guides) {
    if (g.resource) {
      resourceCounts.set(g.resource, (resourceCounts.get(g.resource) ?? 0) + 1);
    }
  }

  const clusters = new Map<string, number>();
  for (const g of guides) {
    const c = g.cluster ?? "none";
    clusters.set(c, (clusters.get(c) ?? 0) + 1);
  }

  console.log(`\nLibrary audit — ${guides.length} guides\n`);

  console.log("  Funnel coverage");
  console.log(
    `    ${withResource}/${guides.length} offer a free resource` +
      `${withResource === guides.length ? "" : "   ← the gap is pages that rank and collect nobody"}`,
  );
  console.log(`    ${inExperiment}/${guides.length} are in an experiment`);

  console.log("\n  By journey stage");
  for (const [cluster, n] of [...clusters].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}  ${cluster}`);
  }

  console.log("\n  Resource spread");
  for (const [slug, n] of [...resourceCounts].sort((a, b) => b[1] - a[1])) {
    /* One resource on most of the library means the matching rules have
       collapsed and readers are being shown something generic. */
    const share = Math.round((n / guides.length) * 100);
    console.log(
      `    ${String(n).padStart(3)}  ${slug}${share > 40 ? `   ← ${share}% of the library, too broad` : ""}`,
    );
  }

  if (warnings.length) {
    console.log(`\n  Warnings (${warnings.length})`);
    for (const w of warnings) console.log(`    · ${w}`);
  }

  if (errors.length) {
    console.log(`\n  Errors (${errors.length})`);
    for (const e of errors) console.log(`    ✗ ${e}`);
    console.log("");
    process.exit(1);
  }

  console.log(`\n  No errors.${warnings.length ? " Warnings above are worth a look." : ""}\n`);
}

main().catch((err) => {
  console.error(`\nAudit failed: ${err.message}\n`);
  process.exit(1);
});
