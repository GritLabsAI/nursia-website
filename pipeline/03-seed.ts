/**
 * Stage 3 — write the run into Sanity.
 *
 * Four things happen here, in an order that matters:
 *
 *   1. The free resources are created, because guides reference them.
 *   2. The funnel experiment is created, for the same reason.
 *   3. The new guides from this run's briefs are written, carrying the
 *      research provenance that justified them.
 *   4. Every guide in the library — the new ones and the forty-five that were
 *      already there — is matched to a resource and to the experiment.
 *
 * Step four is the one that turns a content library into a funnel. Writing
 * five new pages changes very little; attaching a relevant free resource to
 * all fifty changes what every existing page does when somebody lands on it
 * from a search result. The pages were already ranking. They were just not
 * asking for anything.
 *
 * Idempotent, like stage 1. Re-running patches rather than duplicating, and
 * it will not overwrite a resource an editor has since reassigned by hand
 * unless you pass --reassign.
 *
 *   npm run seo:seed
 *   npm run seo:seed -- --dry
 *   npm run seo:seed -- --reassign   # re-apply the matching rules to every guide
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Cluster } from "@/lib/content";
import { DRAFT_GUIDES } from "./data/drafts-2026-09";
import { RESOURCES, type ResourceDraft } from "./data/resources-2026-09";
import { countWords, readingMinutes, toPortableText } from "./lib/portable-text";
import { key, runId, upsertBySlug, writeClient } from "./lib/sanity";

const DRY = process.argv.includes("--dry");
const REASSIGN = process.argv.includes("--reassign");
const RUN = runId();

type Brief = {
  query: string;
  slug: string;
  interest: number;
  trajectory: string;
  related: string[];
  source: string;
  observedAt: string;
};

/**
 * The experiment that ships with run 1.
 *
 * Placement, not copy, because placement is the bigger lever on a long
 * editorial page and because testing copy first tends to produce a 3% move
 * that nobody can act on. The control is where the inline call to action
 * already sits on these pages, so "no change" is a real arm rather than a
 * reconstruction of the old behaviour that might differ subtly from it.
 */
const EXPERIMENT = {
  key: "gate_placement",
  title: "Where the free resource is offered",
  status: "running" as const,
  hypothesis:
    "Offering the resource at the end as well as mid-article will raise signups, because a reader who has finished a guide has more evidence that the free thing is worth an account than one interrupted after two sections. The risk is the opposite: two asks on one page reads as nagging and suppresses both.",
  metric: "signup_rate",
  minimumSample: 1000,
  variants: [
    { key: "control", weight: 34, placement: "mid" },
    { key: "end_only", weight: 33, placement: "end" },
    { key: "both", weight: 33, placement: "both" },
  ],
};

async function main() {
  const client = writeClient();
  const log = (...a: unknown[]) => console.log(...a);

  log(`\nSeeding (${RUN})${DRY ? " — DRY RUN" : ""}\n`);

  /* ------------------------------------------------------ 1. the resources */

  const resourceIds = new Map<string, string>();
  for (const r of RESOURCES) {
    const fields = {
      title: r.title,
      kind: r.kind,
      promise: r.promise,
      contains: r.contains,
      ...(r.headline ? { headline: r.headline } : {}),
      ...(r.body ? { body: r.body } : {}),
      ctaLabel: r.ctaLabel,
      delivery: r.delivery,
      destination: r.destination,
      ...(r.content ? { content: toPortableText(r.content) } : {}),
    };
    if (DRY) {
      resourceIds.set(r.slug, `dry-${r.slug}`);
      continue;
    }
    const { _id } = await upsertBySlug(client, "leadMagnet", r.slug, fields);
    resourceIds.set(r.slug, _id);
  }
  log(`  resources   ${RESOURCES.length} in place`);

  /* ----------------------------------------------------- 2. the experiment */

  let experimentId = `dry-${EXPERIMENT.key}`;
  if (!DRY) {
    const existing = await client.fetch<string | null>(
      `*[_type == "experiment" && key.current == $key][0]._id`,
      { key: EXPERIMENT.key },
    );
    const fields = {
      title: EXPERIMENT.title,
      status: EXPERIMENT.status,
      hypothesis: EXPERIMENT.hypothesis,
      metric: EXPERIMENT.metric,
      minimumSample: EXPERIMENT.minimumSample,
      variants: EXPERIMENT.variants.map((v) => ({
        _type: "experimentVariant",
        _key: key(),
        ...v,
      })),
    };
    experimentId = existing
      ? (await client.patch(existing).set(fields).commit())._id
      : (
          await client.create({
            _type: "experiment",
            key: { _type: "slug", current: EXPERIMENT.key },
            ...fields,
          })
        )._id;
  }
  log(`  experiment  ${EXPERIMENT.key} (${EXPERIMENT.variants.length} arms)`);

  /* ------------------------------------------------------ 3. the new guides */

  const briefsPath = resolve(`pipeline/data/briefs-${RUN}.json`);
  let briefs: Brief[] = [];
  try {
    const file = JSON.parse(await readFile(briefsPath, "utf8")) as {
      selected: Brief[];
      rejected?: {
        query: string;
        interest: number;
        trajectory: string;
        measurement?: string;
      }[];
    };
    /*
     * Both halves of the file, and the rejected half matters more than it
     * looks. Once a guide is published its query stops producing a brief — it
     * is covered now, which is the dedupe working — so on every subsequent run
     * the only record of what that page was measured at sits in `rejected`.
     *
     * Reading only `selected` is how a re-run wipes the provenance off every
     * page it already created: the brief is gone, the fallback fires, and a
     * real trend score is replaced by a guess at the title. That happened.
     */
    briefs = [
      ...file.selected,
      ...(file.rejected ?? []).map((r) => ({
        query: r.query,
        slug: r.query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        interest: r.interest,
        trajectory: r.trajectory,
        related: [],
        source: "measured",
        observedAt: "",
        measurement: r.measurement,
      })) as Brief[],
    ];
  } catch {
    log(`  ! no briefs file for ${RUN} — run \`npm run seo:research\` first`);
  }
  const briefBySlug = new Map(briefs.map((b) => [b.slug, b]));

  /* Topics and authors already exist from stage 1; look up the ids the new
     guides need rather than assuming anything about how they were made. */
  const topicIds = new Map(
    (
      await client.fetch<{ slug: string; _id: string }[]>(
        `*[_type == "topic"]{ _id, "slug": slug.current }`,
      )
    ).map((t) => [t.slug, t._id]),
  );
  const authorId = await client.fetch<string>(
    `*[_type == "author" && name == "Dana Whitfield"][0]._id`,
  );
  const reviewerId = await client.fetch<string>(
    `*[_type == "author" && name == "Priya Raghavan"][0]._id`,
  );

  const newGuideIds = new Map<string, string>();
  for (const g of DRAFT_GUIDES) {
    const topicId = topicIds.get(g.topic);
    if (!topicId) throw new Error(`Unknown topic "${g.topic}" on ${g.slug}`);

    const brief = briefBySlug.get(g.slug);
    const words =
      countWords([g.shortAnswer]) +
      g.sections.reduce((n, s) => n + countWords(s.body), 0) +
      (g.faqs?.reduce((n, f) => n + countWords([f.q, f.a]), 0) ?? 0);

    const fields = {
      title: g.title,
      h1: g.h1,
      cluster: g.cluster,
      shortAnswer: g.shortAnswer,
      minutes: g.minutes ?? readingMinutes(words),
      sections: g.sections.map((s) => ({
        _type: "guideSection",
        _key: key(),
        h2: s.h2,
        body: toPortableText(s.body),
      })),
      ...(g.faqs?.length
        ? {
            faqs: g.faqs.map((f) => ({
              _type: "faq",
              _key: key(),
              q: f.q,
              a: f.a,
            })),
          }
        : {}),
      topic: { _type: "reference", _ref: topicId },
      author: { _type: "reference", _ref: authorId },
      reviewedBy: { _type: "reference", _ref: reviewerId },
      publishedAt: g.updatedISO ?? "2026-09-11",
      updatedAt: g.updatedISO ?? "2026-09-11",
    };

    /*
     * Provenance is only written when this run actually has evidence.
     *
     * With a brief — measured this run — it is set outright. Without one it is
     * offered as a default the document takes only if it has nothing already,
     * because the no-brief fallback is a guess at the title and overwriting a
     * real measurement with it is strictly destructive. A fabricated trend
     * number is worse than none; a fabricated one that *replaced* a real one
     * is worse still.
     */
    const research = brief
      ? {
          research: {
            _type: "research",
            primaryQuery: brief.query,
            secondaryQueries: brief.related ?? [],
            intent: "informational",
            trendScore: brief.interest,
            trajectory: brief.trajectory,
            source: brief.source,
            runId: RUN,
          },
        }
      : {};

    const researchFallback = brief
      ? {}
      : {
          research: {
            _type: "research",
            primaryQuery: g.title.toLowerCase(),
            intent: "informational",
            source: "editorial",
            runId: RUN,
          },
        };

    if (DRY) {
      log(`  guide       ${g.slug} (would create)`);
      continue;
    }
    const { _id, created } = await upsertBySlug(
      client,
      "guide",
      g.slug,
      { ...fields, ...research },
      researchFallback,
    );
    newGuideIds.set(g.slug, _id);
    log(`  guide       ${g.slug} ${created ? "(created)" : "(updated)"}`);
  }

  /* readNext on the new guides, now that every id is resolvable. Same two-pass
     reason as stage 1, and these point at guides from the earlier waves. */
  if (!DRY) {
    const allIds = new Map(
      (
        await client.fetch<{ slug: string; _id: string }[]>(
          `*[_type == "guide"]{ _id, "slug": slug.current }`,
        )
      ).map((g) => [g.slug, g._id]),
    );
    for (const g of DRAFT_GUIDES) {
      const refs = g.readNext
        .map((s) => allIds.get(s))
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ _type: "reference", _ref: id, _key: key() }));
      if (refs.length) {
        await client.patch(newGuideIds.get(g.slug)!).set({ readNext: refs }).commit();
      }
    }
  }

  /* ------------------------------------------- 4. attach resources to all */

  const guides = await client.fetch<
    {
      _id: string;
      slug: string;
      cluster: Cluster;
      topic: string | null;
      hasResource: boolean;
    }[]
  >(`*[_type == "guide"]{
       _id,
       "slug": slug.current,
       cluster,
       "topic": topic->slug.current,
       "hasResource": defined(leadMagnet)
     }`);

  const counts = new Map<string, number>();
  let attached = 0;
  let skipped = 0;

  for (const g of guides) {
    if (g.hasResource && !REASSIGN) {
      skipped++;
      continue;
    }
    const resource = matchResource(g.slug, g.topic, g.cluster);
    counts.set(resource.slug, (counts.get(resource.slug) ?? 0) + 1);
    if (DRY) continue;

    await client
      .patch(g._id)
      .set({
        leadMagnet: { _type: "reference", _ref: resourceIds.get(resource.slug)! },
        experiment: { _type: "reference", _ref: experimentId },
      })
      .commit();
    attached++;
  }

  log(`\n  Resource assignment`);
  for (const [slug, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    log(`    ${String(n).padStart(3)}  ${slug}`);
  }
  log(
    `\n  ${attached} guides wired up${skipped ? `, ${skipped} left alone (pass --reassign to redo them)` : ""}`,
  );
  log(`  ${guides.length} guides in the library\n`);
}

/**
 * Most specific wins: an explicit guide slug, then the question topic, then
 * the journey stage, then the fallback.
 *
 * The fallback is not a last resort so much as a deliberate default — it is
 * the mixed diagnostic set, which is a reasonable offer on any page that has
 * no better one, and it is the offer this site is actually best at making.
 */
function matchResource(
  slug: string,
  topic: string | null,
  cluster: Cluster,
): ResourceDraft {
  return (
    RESOURCES.find((r) => r.match.guides?.includes(slug)) ??
    (topic ? RESOURCES.find((r) => r.match.topics?.includes(topic)) : undefined) ??
    RESOURCES.find((r) => r.match.clusters?.includes(cluster)) ??
    RESOURCES.find((r) => r.match.fallback)!
  );
}

main().catch((err) => {
  console.error(`\nSeeding failed: ${err.message}\n`);
  process.exit(1);
});
