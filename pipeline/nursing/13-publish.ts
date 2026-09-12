/**
 * Stage 13 — publish the library, and wire it into the site.
 *
 * Four things happen, and the order matters:
 *
 *   1. Every written page is upserted as a `nursingPage`, carrying the
 *      research that justified it and the quality report that cleared it.
 *   2. Each page is matched to a question-bank topic, a free resource and the
 *      running experiment — the same matching the guides get, because a
 *      thousand pages that collect nothing are a thousand pages of cost.
 *   3. `readNext` is filled in, in a second pass, once every id exists.
 *   4. `relatedGuides` links each page up into the hand-written library.
 *
 * Steps three and four are the ones that decide whether this is a library or a
 * thousand orphans. A page nothing links to is a page a crawler reaches only
 * through the sitemap, which is a hint rather than a path — and Google
 * deprioritises exactly the deep, new, unlinked URLs that a batch like this
 * produces. Internal links are the mechanism; the sitemap is the reminder.
 *
 * Idempotent. Re-running patches rather than duplicating, and it will not
 * overwrite a resource an editor reassigned by hand unless you pass
 * --reassign.
 *
 *   npm run nursing:publish
 *   npm run nursing:publish -- --dry
 *   npm run nursing:publish -- --limit 20
 *   npm run nursing:publish -- --republish --reassign   # re-apply fixes to live pages
 */


import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { key, runId, upsertBySlug, writeClient } from "../lib/sanity";
import { toPortableText } from "../lib/portable-text";
import { openNursingStore, type PageRow } from "./lib/store";
import { CLINICAL_INDEX, type EntityKind } from "./lib/taxonomy";

const RUN = runId();
const DRY = process.argv.includes("--dry");
const REASSIGN = process.argv.includes("--reassign");
const REPUBLISH = process.argv.includes("--republish");
const LIMIT = Number(argOf("--limit") ?? "0") || Infinity;
const TODAY = new Date().toISOString().slice(0, 10);

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * One publisher at a time.
 *
 * `upsertBySlug` is read-then-write: it asks whether a slug exists and then
 * creates or patches. Two runs overlapping both read "no such slug" for the
 * same page and both create one, and the result is two documents where one
 * belongs — thirty-six of them, the first time this ran, because a
 * backgrounded publish kept going after the shell that started it returned and
 * a second was launched on the assumption it had finished.
 *
 * A lock file is the right size of fix. The alternative — deriving `_id` from
 * the slug so a create is idempotent — would work, and it is exactly what the
 * guides pipeline deliberately does not do, because a renamed slug would then
 * silently orphan the document at the old id. Better to make the overlap
 * impossible than to make it survivable.
 *
 * Stale locks clear themselves: the file holds a pid, and a lock whose process
 * is gone is one a crash left behind rather than a run in progress.
 */
const LOCK = resolve("pipeline/nursing/data/publish.lock");

function acquireLock() {
  if (existsSync(LOCK)) {
    const held = Number(readFileSync(LOCK, "utf8").trim());
    if (Number.isFinite(held) && isAlive(held)) {
      throw new Error(
        `Another publish is running (pid ${held}). Two at once create duplicate ` +
          `documents for the same slug — wait for it, or kill it and delete ` +
          `${LOCK}.`,
      );
    }
    console.log(`  lock        clearing a stale lock from pid ${held}`);
  }
  writeFileSync(LOCK, String(process.pid));
}

function releaseLock() {
  try {
    if (existsSync(LOCK) && readFileSync(LOCK, "utf8").trim() === String(process.pid)) {
      unlinkSync(LOCK);
    }
  } catch {
    /* A lock we cannot remove is a lock the next run will find stale. */
  }
}

/** Signal 0 asks "does this pid exist" without sending anything. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  acquireLock();
  const client = writeClient();
  const store = openNursingStore();

  /*
   * `written` is the queue; `--republish` reopens what is already live.
   *
   * Needed because a fix to this stage — a better resource rule, a field that
   * was never being carried through — does not reach pages it has already
   * marked `published`, and the first run of this shipped two such bugs. The
   * alternative is editing a thousand documents by hand, so the flag exists;
   * it is opt-in because re-patching the whole library on every run would make
   * a routine publish touch a thousand documents to change nothing.
   */
  const pages = (REPUBLISH
    ? [...store.pages("written"), ...store.pages("published")]
    : store.pages("written")
  ).slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);

  /*
   * The clinical subject, read back from the plan.
   *
   * `nursing_page` does not carry `entity` — the writer produces prose and the
   * plan is where the subject was decided — so it is joined here rather than
   * duplicated into the page row. It matters more than a display field: it is
   * what makes the page's `about` a `MedicalEntity` in schema.org rather than a
   * generic `Thing`, which is the difference between an answer engine knowing
   * this page is about digoxin toxicity and inferring it from the title.
   */
  const entityBySlug = new Map(
    store.plans().map((p) => [p.slug, p.entity] as const),
  );

  /*
   * What kind of thing each entity is, from the clinical index.
   *
   * Used to pick the offer. Without it every clinical page falls through to the
   * family default and 96% of the library is offered one cheatsheet — including
   * the four hundred medication pages, where "the drug cards" is obviously the
   * better offer and is sitting unused. The index already knows a drug from a
   * lab value, so the information exists; it simply was not being asked for.
   */
  const kindByEntity = new Map<string, EntityKind>();
  for (const list of Object.values(CLINICAL_INDEX)) {
    for (const e of list) kindByEntity.set(e.name.toLowerCase(), e.kind);
  }
  if (!pages.length) {
    console.log("\nNothing written is waiting to publish.\n");
    store.close();
    return;
  }

  console.log(`\nPublish (${RUN})${DRY ? " — DRY RUN" : ""}`);
  console.log(`  pages       ${pages.length} written and waiting\n`);

  /* Everything the pages reference, resolved once. A per-page lookup would be
     four thousand extra round trips over a run this size. */
  const topicIds = new Map(
    (
      await client.fetch<{ slug: string; _id: string }[]>(
        `*[_type == "topic"]{ _id, "slug": slug.current }`,
      )
    ).map((t) => [t.slug, t._id]),
  );
  const authorId = await client.fetch<string | null>(
    `*[_type == "author" && name == "Dana Whitfield"][0]._id`,
  );
  const reviewerId = await client.fetch<string | null>(
    `*[_type == "author" && name == "Priya Raghavan"][0]._id`,
  );
  if (!authorId) {
    throw new Error(
      "No author document found. Run the guides pipeline's `npm run seo:migrate` " +
        "first — every page needs a credentialed byline, and health content " +
        "without one is the kind of page search engines are explicitly built " +
        "to demote.",
    );
  }

  const resources = await client.fetch<{ _id: string; slug: string; match: unknown }[]>(
    `*[_type == "leadMagnet"]{ _id, "slug": slug.current }`,
  );
  const experimentId = await client.fetch<string | null>(
    `*[_type == "experiment" && key.current == "gate_placement"][0]._id`,
  );

  /* The guides the library links up into, keyed by the question-bank topic
     they serve, so a page about heart failure links to the cardiovascular
     guides rather than to whatever is alphabetically first. */
  const guidesByTopic = new Map<string, string[]>();
  for (const g of await client.fetch<{ _id: string; topic: string | null }[]>(
    `*[_type == "guide"]{ _id, "topic": topic->slug.current }`,
  )) {
    if (!g.topic) continue;
    const list = guidesByTopic.get(g.topic) ?? [];
    list.push(g._id);
    guidesByTopic.set(g.topic, list);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const idBySlug = new Map<string, string>();

  for (const p of pages) {
    const topicId = topicIds.get(p.nursingTopic);
    if (!topicId) {
      console.log(`  ! ${p.slug} — unknown topic "${p.nursingTopic}", skipped`);
      skipped++;
      continue;
    }

    const sections = JSON.parse(p.sections) as { h2: string; body: string[] }[];
    const faqs = JSON.parse(p.faqs) as { q: string; a: string }[];
    const entity = entityBySlug.get(p.slug) ?? null;

    const fields = {
      title: p.title,
      h1: p.h1,
      family: p.family,
      ...(entity ? { entity } : {}),
      shortAnswer: p.shortAnswer,
      minutes: p.minutes,
      sections: sections.map((s) => ({
        _type: "guideSection",
        _key: key(),
        h2: s.h2,
        body: toPortableText(s.body),
      })),
      ...(faqs.length
        ? { faqs: faqs.map((f) => ({ _type: "faq", _key: key(), q: f.q, a: f.a })) }
        : {}),
      topic: { _type: "reference", _ref: topicId },
      author: { _type: "reference", _ref: authorId },
      ...(reviewerId ? { reviewedBy: { _type: "reference", _ref: reviewerId } } : {}),
      updatedAt: TODAY,
      quality: p.quality,
      ...(p.metaDescription ? { seo: { _type: "seo", description: p.metaDescription } } : {}),
      research: {
        _type: "research",
        primaryQuery: p.slug.replace(/-/g, " "),
        intent: "informational",
        source: `nursing-pipeline:${p.model}`,
        runId: RUN,
      },
    };

    if (DRY) {
      console.log(`  ${p.slug} (would upsert, ${p.words}w)`);
      continue;
    }

    /* `publishedAt` is set only if missing. A re-run must not move the first
       publication date of a page that has been live for a month — that date is
       what `datePublished` reports, and a library where everything was
       published today is a library that looks generated. */
    const { _id, created: isNew } = await upsertBySlug(
      client,
      "nursingPage",
      p.slug,
      fields,
      { publishedAt: TODAY },
    );

    idBySlug.set(p.slug, _id);
    if (isNew) created++;
    else updated++;

    store.markPublished(p.slug, _id);

    if ((created + updated) % 50 === 0) {
      console.log(`  ${created + updated}/${pages.length} upserted`);
    }
  }

  if (DRY) {
    console.log(`\n  dry run — nothing written\n`);
    store.close();
    return;
  }

  console.log(`\n  upserted    ${created} created, ${updated} updated, ${skipped} skipped`);

  /* --------------------------------------------- conversion and linking */

  /* A second pass, because readNext points at pages this run may only just
     have created and a reference to an id that does not exist yet is a
     validation error rather than a dangling link. */
  const all = await client.fetch<
    { _id: string; slug: string; topic: string | null; family: string; entity: string | null; hasResource: boolean }[]
  >(`*[_type == "nursingPage"]{
       _id, "slug": slug.current, "topic": topic->slug.current, family, entity,
       "hasResource": defined(leadMagnet)
     }`);

  const byTopic = new Map<string, typeof all>();
  for (const page of all) {
    if (!page.topic) continue;
    const list = byTopic.get(page.topic) ?? [];
    list.push(page);
    byTopic.set(page.topic, list);
  }

  let linked = 0;
  let attached = 0;

  for (const page of all) {
    const patch: Record<string, unknown> = {};

    /*
     * Read-next goes sideways within the topic.
     *
     * Picked by position in the topic's list rather than at random, which
     * makes the graph deterministic and — more usefully — connected. Random
     * neighbours produce a graph with islands: a handful of pages nobody
     * points at, which are precisely the pages that never get crawled. Taking
     * the next four in a stable order makes every page reachable from its
     * neighbour, so the whole topic is a ring rather than a scatter.
     */
    const siblings = byTopic.get(page.topic ?? "") ?? [];
    if (siblings.length > 1) {
      const i = siblings.findIndex((s) => s._id === page._id);
      const picks: string[] = [];
      for (let n = 1; n <= 4 && n < siblings.length; n++) {
        picks.push(siblings[(i + n) % siblings.length]._id);
      }
      patch.readNext = picks.map((id) => ({ _type: "reference", _ref: id, _key: key() }));
      linked++;
    }

    const upward = (guidesByTopic.get(page.topic ?? "") ?? []).slice(0, 2);
    if (upward.length) {
      patch.relatedGuides = upward.map((id) => ({
        _type: "reference",
        _ref: id,
        _key: key(),
      }));
    }

    if (!page.hasResource || REASSIGN) {
      const resource = matchResource(
        resources,
        page.topic,
        page.family ?? "clinical",
        page.entity ? kindByEntity.get(page.entity.toLowerCase()) : undefined,
      );
      if (resource) {
        patch.leadMagnet = { _type: "reference", _ref: resource._id };
        if (experimentId) patch.experiment = { _type: "reference", _ref: experimentId };
        attached++;
      }
    }

    if (Object.keys(patch).length) await client.patch(page._id).set(patch).commit();
  }

  console.log(`  linked      ${linked} pages given siblings and parent guides`);
  console.log(`  converting  ${attached} pages given a free resource`);
  console.log(`  library     ${all.length} nursing pages live`);
  console.log(`  store       ${JSON.stringify(store.counts())}\n`);

  store.close();
}

/**
 * Which free thing to offer, by question-bank topic.
 *
 * An explicit table rather than a string match between the topic slug and the
 * resource slug, because that match does not exist: the resources are named
 * for what they contain ("lab-values-that-repeat") and the topics for what
 * they cover ("dosage-and-labs"), so every lookup fell through to the first
 * resource in the list. Every page in the library was offered the lab values
 * cheatsheet — including the pages about delegation and fire safety, where it
 * is a non sequitur, and a non sequitur converts like a banner ad.
 *
 * Unmapped topics fall through to the family default below, which is the
 * honest behaviour: a rule that covers most pages well and says so beats one
 * that appears to cover everything by accident.
 */
const RESOURCE_BY_TOPIC: Record<string, string> = {
  pharmacology: "high-alert-drug-cards",
  "dosage-and-labs": "lab-values-that-repeat",
  "prioritization-delegation": "prioritization-decision-tree",
  "safe-care": "prioritization-decision-tree",
  sata: "ngn-format-drill",
  fundamentals: "weak-topic-starter-set",
  "risk-reduction": "lab-values-that-repeat",
  "health-promotion": "weak-topic-starter-set",
  psychosocial: "weak-topic-starter-set",
  "basic-care": "weak-topic-starter-set",
};

/**
 * By what kind of clinical thing the page is about.
 *
 * Checked before the topic, because it is the more specific fact: a page about
 * digoxin toxicity sits under cardiovascular, and the right offer for it is the
 * drug cards rather than whatever cardiovascular pages get in general.
 */
const RESOURCE_BY_KIND: Partial<Record<EntityKind, string>> = {
  drug: "high-alert-drug-cards",
  lab: "lab-values-that-repeat",
};

/** And by what kind of page it is, when nothing more specific applies. */
const RESOURCE_BY_FAMILY: Record<string, string> = {
  clinical: "weak-topic-starter-set",
  practice: "fourteen-day-plan",
  faq: "weak-topic-starter-set",
  exam: "nclex-eligibility-checklist",
  career: "international-document-checklist",
};

/** Last resort, and a defensible one: the thing this site is best at offering. */
const RESOURCE_FALLBACK = "weak-topic-starter-set";

function matchResource(
  resources: { _id: string; slug: string }[],
  topic: string | null,
  family: string,
  kind: EntityKind | undefined,
): { _id: string; slug: string } | undefined {
  if (!resources.length) return undefined;
  const wanted = [
    kind ? RESOURCE_BY_KIND[kind] : undefined,
    topic ? RESOURCE_BY_TOPIC[topic] : undefined,
    RESOURCE_BY_FAMILY[family],
    RESOURCE_FALLBACK,
  ].filter(Boolean) as string[];

  for (const slug of wanted) {
    const hit = resources.find((r) => r.slug === slug);
    if (hit) return hit;
  }
  return resources[0];
}

main()
  .then(releaseLock)
  .catch((err) => {
    releaseLock();
    console.error(`\nPublish failed: ${err.message}\n`);
    process.exit(1);
  });
