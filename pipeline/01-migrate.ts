/**
 * Stage 1 — move the hand-written library into Sanity.
 *
 * Forty-five guides and twenty topics currently live in TypeScript. They are
 * good, they were written by people, and nothing here rewrites a word of them:
 * this stage is a transcription, not an edit. Paragraphs become Portable Text
 * blocks one-for-one, `readNext` lists become real references, and the two
 * credited nurses become author documents that every guide points at instead
 * of forty-five copies of the same string.
 *
 * It is idempotent. Run it twice and the second run patches the same
 * documents rather than minting duplicates — which matters, because the first
 * time anyone runs a migration against production it is usually twice.
 *
 * Two passes, and the reason is references: a guide's `readNext` can point at
 * a guide that does not exist yet, so pass one creates every document without
 * its links and pass two fills them in once every id is known. Doing it in one
 * pass means either sorting the graph topologically — it has cycles, so that
 * fails — or writing dangling references and hoping.
 *
 *   npm run seo:migrate            # write to Sanity
 *   npm run seo:migrate -- --dry   # print what it would do, touch nothing
 */

import { GUIDES, REVIEWERS, TOPICS, guideModified } from "@/lib/content";
import { countWords, readingMinutes, toPortableText } from "./lib/portable-text";
import { key, runId, upsertBySlug, writeClient } from "./lib/sanity";

const DRY = process.argv.includes("--dry");
const RUN = runId();

/** The byline the guide pages already print, as documents. */
const AUTHOR_SLUG = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const client = writeClient();
  const log = (...args: unknown[]) => console.log(...args);

  log(`\nMigrating the hand-written library into Sanity (${RUN})`);
  log(`${GUIDES.length} guides, ${TOPICS.length} topics, ${REVIEWERS.length} people`);
  if (DRY) log("DRY RUN — nothing will be written\n");

  /* ---------------------------------------------------------------- people */

  const authorIds = new Map<string, string>();
  for (const person of REVIEWERS) {
    const slug = AUTHOR_SLUG(person.name);
    const fields = {
      name: person.name,
      honorific: person.credentials,
      jobTitle: person.role,
      bio: person.note,
      knowsAbout: ["NCLEX-RN", "Nursing education"],
    };
    if (DRY) {
      log(`  author  ${slug}`);
      authorIds.set(person.name, `dry-${slug}`);
      continue;
    }
    /* Authors have no slug field, so they are matched on name instead — the
       same "find by content, not by a derived _id" rule, different field. */
    const existing = await client.fetch<string | null>(
      `*[_type == "author" && name == $name][0]._id`,
      { name: person.name },
    );
    const id = existing
      ? (await client.patch(existing).set(fields).commit())._id
      : (await client.create({ _type: "author", ...fields }))._id;
    authorIds.set(person.name, id);
    log(`  author  ${person.name} ${existing ? "(updated)" : "(created)"}`);
  }

  const leadAuthor = authorIds.get("Dana Whitfield")!;
  const reviewer = authorIds.get("Priya Raghavan")!;

  /* ---------------------------------------------------------------- topics */

  const topicIds = new Map<string, string>();
  for (const t of TOPICS) {
    const fields = {
      name: t.name,
      h1: t.h1,
      category: t.category,
      group: t.group,
      blurb: t.blurb,
      intro: t.intro,
      ...(t.share ? { share: t.share } : {}),
    };
    if (DRY) {
      topicIds.set(t.slug, `dry-${t.slug}`);
      continue;
    }
    const { _id, created } = await upsertBySlug(client, "topic", t.slug, fields);
    topicIds.set(t.slug, _id);
    if (created) log(`  topic   ${t.slug} (created)`);
  }
  log(`  topics  ${TOPICS.length} in place`);

  /* ------------------------------------------------- guides, pass 1 of 2 */

  const guideIds = new Map<string, string>();
  let created = 0;

  for (const g of GUIDES) {
    const topicId = topicIds.get(g.topic);
    if (!topicId) {
      /* A guide pointing at a topic that does not exist would publish a page
         whose only call to action is a 404. Stop rather than paper over it. */
      throw new Error(
        `Guide "${g.slug}" references topic "${g.topic}", which is not in TOPICS.`,
      );
    }

    const words =
      countWords([g.shortAnswer]) +
      g.sections.reduce((n, s) => n + countWords(s.body), 0) +
      (g.faqs?.reduce((n, f) => n + countWords([f.q, f.a]), 0) ?? 0);

    const fields = {
      title: g.title,
      h1: g.h1,
      cluster: g.cluster,
      shortAnswer: g.shortAnswer,
      /* The hand-written `minutes` is what the pages have shown until now and
         readers may have seen it; keep it and only compute when it is absent. */
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
      author: { _type: "reference", _ref: leadAuthor },
      reviewedBy: { _type: "reference", _ref: reviewer },
      publishedAt: "2026-08-01",
      updatedAt: guideModified(g),
      research: {
        _type: "research",
        primaryQuery: g.title.toLowerCase(),
        intent: "informational",
        source: "editorial",
        runId: RUN,
      },
    };

    if (DRY) {
      guideIds.set(g.slug, `dry-${g.slug}`);
      continue;
    }
    const result = await upsertBySlug(client, "guide", g.slug, fields);
    guideIds.set(g.slug, result._id);
    if (result.created) created++;
  }
  log(`  guides  ${GUIDES.length} in place (${created} created this run)`);

  /* ------------------------------------------------- guides, pass 2 of 2 */

  if (!DRY) {
    let linked = 0;
    for (const g of GUIDES) {
      const refs = g.readNext
        .map((slug) => guideIds.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ _type: "reference", _ref: id, _key: key() }));

      const missing = g.readNext.filter((slug) => !guideIds.get(slug));
      if (missing.length) {
        log(`  ! ${g.slug} reads next to ${missing.join(", ")} — not found, skipped`);
      }
      if (!refs.length) continue;

      await client.patch(guideIds.get(g.slug)!).set({ readNext: refs }).commit();
      linked++;
    }
    log(`  links   ${linked} guides cross-linked`);
  }

  log(`\nDone.${DRY ? " (dry run)" : ""}\n`);
}

main().catch((err) => {
  console.error(`\nMigration failed: ${err.message}\n`);
  process.exit(1);
});
