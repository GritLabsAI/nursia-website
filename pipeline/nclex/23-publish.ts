/**
 * Stage 23 — write the compiled pages into Sanity.
 *
 * Everything this stage needs already exists: the question topics, the authors
 * and the free resources were created by the guide pipeline's stages 1 and 3.
 * This one resolves them by slug and refuses to run if they are missing, rather
 * than creating its own copies — two "Dana Whitfield" author documents is the
 * kind of mess that is invisible for a month and then impossible to untangle.
 *
 * Idempotent, by the same rule the rest of the repo uses: upsert by slug, patch
 * rather than replace, and never overwrite provenance with a guess. Re-running
 * after an editor has fixed a sentence in the Studio updates the fields this
 * run computed and leaves the rest alone.
 *
 * The links between pages are deliberately *not* set here. They need every
 * document to exist first, and doing them in a separate stage means a link run
 * can be repeated — after a later batch, say — without republishing any prose.
 *
 *   npm run nclex:publish
 *   npm run nclex:publish -- --dry
 *   npm run nclex:publish -- --take 10
 */

import type { Cluster } from "@/lib/content";
import { RESOURCES, type ResourceDraft } from "../data/resources-2026-09";
import { toPortableText } from "../lib/portable-text";
import { key, runId, upsertBySlug, writeClient } from "../lib/sanity";
import { openStore, type PageRow } from "./lib/store";

const DRY = process.argv.includes("--dry");
const TAKE = Number(argOf("--take") ?? Infinity);
const RUN = runId();

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** The credited pair, as the guide library already spells them. */
const AUTHOR = "Dana Whitfield";
const REVIEWER = "Priya Raghavan";

/** The funnel experiment these pages join, created by the guide pipeline. */
const EXPERIMENT_KEY = "gate_placement";

async function main() {
  const store = openStore();
  const client = writeClient();

  try {
    const drafted = store.drafts("drafted").slice(0, TAKE);
    if (!drafted.length) {
      console.log(`\nNothing to publish. Run \`npm run nclex:compile\` first.\n`);
      return;
    }

    const pages = new Map(store.pages().map((p) => [p.slug, p]));

    console.log(`\nPublish`);
    console.log(`  run         ${RUN}`);
    console.log(`  pages       ${drafted.length}`);

    /* ------------------------------------------------- what must exist */

    const topicIds = new Map(
      (
        await client.fetch<{ slug: string; _id: string }[]>(
          `*[_type == "topic"]{ _id, "slug": slug.current }`,
        )
      ).map((t) => [t.slug, t._id]),
    );
    const resourceIds = new Map(
      (
        await client.fetch<{ slug: string; _id: string }[]>(
          `*[_type == "leadMagnet"]{ _id, "slug": slug.current }`,
        )
      ).map((r) => [r.slug, r._id]),
    );
    const authorId = await client.fetch<string | null>(
      `*[_type == "author" && name == $name][0]._id`,
      { name: AUTHOR },
    );
    const reviewerId = await client.fetch<string | null>(
      `*[_type == "author" && name == $name][0]._id`,
      { name: REVIEWER },
    );
    const experimentId = await client.fetch<string | null>(
      `*[_type == "experiment" && key.current == $key][0]._id`,
      { key: EXPERIMENT_KEY },
    );

    if (!authorId || !reviewerId) {
      throw new Error(
        `The credited authors are not in the dataset. Run the guide pipeline's ` +
          `\`npm run seo:migrate\` first — this stage will not create them.`,
      );
    }
    if (!resourceIds.size) {
      throw new Error(
        `No free resources in the dataset. Run \`npm run seo:seed\` first — a ` +
          `page published without an offer is a page that ranks and collects ` +
          `nobody, and attaching them later means editing a hundred documents.`,
      );
    }

    console.log(`  topics      ${topicIds.size}`);
    console.log(`  resources   ${resourceIds.size}`);
    console.log(`  experiment  ${experimentId ? EXPERIMENT_KEY : "none running"}`);

    /* ------------------------------------------------------- the write */

    const today = new Date().toISOString().slice(0, 10);
    const assigned = new Map<string, number>();
    let created = 0;
    let updated = 0;

    for (const draft of drafted) {
      const page = pages.get(draft.slug);
      if (!page) {
        /* The store's own foreign key, checked rather than assumed: a draft
           without a plan row has no topic, no target query and no provenance. */
        console.log(`  ! ${draft.slug} has no planned row — skipped`);
        continue;
      }

      const topicId = topicIds.get(page.questionTopic);
      if (!topicId) {
        throw new Error(
          `${draft.slug} points at question set "${page.questionTopic}", which ` +
            `is not in Sanity. The page promises practice it cannot deliver, so ` +
            `the run stops here rather than publishing a broken link.`,
        );
      }

      const resource = matchResource(page);
      const resourceId = resourceIds.get(resource.slug);
      assigned.set(resource.slug, (assigned.get(resource.slug) ?? 0) + 1);

      const sections = JSON.parse(draft.sections) as { h2: string; body: string[] }[];
      const faqs = JSON.parse(draft.faqs) as { q: string; a: string }[];
      const keyPoints = JSON.parse(draft.keyPoints) as string[];

      const fields = {
        title: page.title,
        h1: page.h1,
        kind: page.kind,
        examCategory: page.examCategory,
        cluster: page.cluster,
        shortAnswer: draft.shortAnswer,
        keyPoints,
        minutes: draft.minutes,
        sections: sections.map((s) => ({
          _type: "guideSection",
          _key: key(),
          h2: s.h2,
          body: toPortableText(s.body),
        })),
        ...(draft.examTip ? { examTip: draft.examTip } : {}),
        ...(faqs.length
          ? {
              faqs: faqs.map((f) => ({ _type: "faq", _key: key(), q: f.q, a: f.a })),
            }
          : {}),
        topic: { _type: "reference", _ref: topicId },
        author: { _type: "reference", _ref: authorId },
        reviewedBy: { _type: "reference", _ref: reviewerId },
        updatedAt: today,
        /*
         * Provenance, set outright rather than as a fallback.
         *
         * Unlike the guide pipeline — where a re-run can lose the measurement
         * that justified a page and must not overwrite it with a guess — every
         * number here comes from the local store, which still holds the export
         * row. Re-running rewrites it with the same values or better ones.
         */
        research: {
          _type: "research",
          primaryQuery: page.primaryQuery,
          secondaryQueries: JSON.parse(page.secondary) as string[],
          intent: intentFor(page),
          source: "keyword-csv",
          runId: page.runId,
        },
      };

      if (DRY) {
        console.log(
          `  ${draft.slug.padEnd(46)} ${page.questionTopic.padEnd(24)} ${resource.slug}`,
        );
        continue;
      }

      const { _id, created: isNew } = await upsertBySlug(
        client,
        "seoPage",
        draft.slug,
        {
          ...fields,
          ...(resourceId
            ? { leadMagnet: { _type: "reference", _ref: resourceId } }
            : {}),
          ...(experimentId
            ? { experiment: { _type: "reference", _ref: experimentId } }
            : {}),
        },
        /* First-published only: moving it on every run would make every page
           look new every time the pipeline runs, which is a lie to a crawler
           and to a reader. */
        { publishedAt: today },
      );

      store.markPublished(draft.slug, _id);
      isNew ? created++ : updated++;
      console.log(`  ${isNew ? "created" : "updated"}  ${draft.slug}`);
    }

    if (DRY) {
      console.log(`\n  --dry, nothing written\n`);
      return;
    }

    console.log(`\n  Resource assignment`);
    for (const [slug, n] of [...assigned].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}  ${slug}`);
    }
    console.log(`\n  ${created} created, ${updated} updated`);
    console.log(`  stored      ${JSON.stringify(store.counts())}`);
    console.log(`\n  Next: npm run nclex:link\n`);
  } finally {
    store.close();
  }
}

/**
 * Which free resource belongs on this page.
 *
 * The same rules the guides use, and reused deliberately: a reader who lands on
 * a review page and one who lands on a guide about the same subject should be
 * offered the same thing, or neither number means anything.
 *
 * One difference is worth knowing. On a guide, matching by question topic is a
 * weak signal — a guide's topic was chosen to answer "which question set should
 * this page link to", so the page about choosing a state board carries
 * `safe-care`. On a review page the topic *is* the subject: it was derived from
 * the query the page targets. So topic matching, which needed explicit
 * overrides for the guides, is the reliable path here.
 */
function matchResource(page: PageRow): ResourceDraft {
  return (
    RESOURCES.find((r) => r.match.topics?.includes(page.questionTopic)) ??
    RESOURCES.find((r) => r.match.clusters?.includes(page.cluster as Cluster)) ??
    RESOURCES.find((r) => r.match.fallback)!
  );
}

/** The schema's four intents, from the export's rather different vocabulary. */
function intentFor(page: PageRow): string {
  if (page.kind === "practice" || page.kind === "strategy") return "transactional";
  return "informational";
}

main().catch((err) => {
  console.error(`\nPublishing failed: ${err.message}\n`);
  process.exit(1);
});
