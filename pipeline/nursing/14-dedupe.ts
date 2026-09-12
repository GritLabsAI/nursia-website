/**
 * Stage 14 — remove documents that share a slug.
 *
 * A repair tool, and a record of how the damage was done.
 *
 * `upsertBySlug` finds a document by querying for its slug and then either
 * patches it or creates a new one. That is read-then-write, and it is only
 * safe while exactly one process is doing it. Two publish runs overlapping —
 * which is easy to cause, because a backgrounded run keeps going after the
 * shell that started it returns — both read "no document with this slug" for
 * the same page, and both create one. Thirty-six pages ended up with two
 * documents each that way.
 *
 * The symptom is quiet. The page route takes `[0]` and renders fine; the
 * Studio shows two identical entries; and the sitemap emits the slug twice,
 * which is the one place it actually costs something.
 *
 * Cleanup is in three steps because Sanity will not delete a document another
 * document references:
 *
 *   1. Pick a keeper per slug — the most complete document, then the oldest,
 *      so the surviving `_id` is the one most likely to be referenced already.
 *   2. Strip every reference to a loser out of the pages that point at it.
 *   3. Delete the losers, then rebuild the links by re-running stage 13.
 *
 *   npm run nursing:dedupe -- --dry
 *   npm run nursing:dedupe
 */

import { writeClient } from "../lib/sanity";

const DRY = process.argv.includes("--dry");
const TYPE = argOf("--type") ?? "nursingPage";

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

type Doc = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  slug: string | null;
  sections: number;
  words: number;
};

async function main() {
  const client = writeClient();

  const docs = await client.fetch<Doc[]>(
    `*[_type == $type && !(_id in path("drafts.**"))]{
       _id, _createdAt, _updatedAt,
       "slug": slug.current,
       "sections": count(sections),
       "words": length(pt::text(sections[].body))
     }`,
    { type: TYPE },
  );

  const bySlug = new Map<string, Doc[]>();
  for (const d of docs) {
    if (!d.slug) continue;
    const list = bySlug.get(d.slug) ?? [];
    list.push(d);
    bySlug.set(d.slug, list);
  }

  const duplicated = [...bySlug.entries()].filter(([, v]) => v.length > 1);

  console.log(`\nDedupe ${TYPE}${DRY ? " — DRY RUN" : ""}`);
  console.log(`  documents   ${docs.length}`);
  console.log(`  slugs       ${bySlug.size}`);
  console.log(`  duplicated  ${duplicated.length}\n`);

  if (!duplicated.length) {
    console.log("  Nothing to do.\n");
    return;
  }

  /* Keep the most complete document. Ties go to the oldest, because an older
     `_id` is the one other documents are more likely to already reference —
     which keeps step two small and makes the repair less destructive. */
  const losers: string[] = [];
  for (const [, group] of duplicated) {
    const ranked = [...group].sort(
      (a, b) =>
        b.sections - a.sections ||
        (b.words ?? 0) - (a.words ?? 0) ||
        a._createdAt.localeCompare(b._createdAt),
    );
    losers.push(...ranked.slice(1).map((d) => d._id));
  }

  console.log(`  ${losers.length} document(s) to remove\n`);

  if (DRY) {
    for (const [slug, group] of duplicated.slice(0, 10)) {
      console.log(`    ${slug}  ${group.map((g) => `${g._id}(${g.sections}s)`).join("  ")}`);
    }
    console.log(`\n  dry run — nothing deleted\n`);
    return;
  }

  /* Anything pointing at a loser, in any reference array. Fetched by id rather
     than by walking every page, because `references()` is indexed and a
     thousand-document scan is not. */
  const referrers = await client.fetch<
    { _id: string; readNext: string[] | null; relatedGuides: string[] | null }[]
  >(
    `*[references($losers)]{
       _id,
       "readNext": readNext[]._ref,
       "relatedGuides": relatedGuides[]._ref
     }`,
    { losers },
  );

  /*
   * Both arrays are unset on every referrer, unconditionally.
   *
   * The first version only unset the array that appeared to contain a loser,
   * decided from a projected list of `_ref` values — and the delete still
   * failed with "cannot be deleted as there are references to it". Whatever the
   * projection missed, the conditional was the thing standing between a correct
   * repair and a half-finished one, and it was buying nothing: stage 13 rebuilds
   * both arrays from scratch on the next run, so unsetting an array that did not
   * need it costs one patch and no content.
   */
  let cleaned = 0;
  for (const r of referrers) {
    await client.patch(r._id).unset(["readNext", "relatedGuides"]).commit();
    cleaned++;
  }

  console.log(`  ${cleaned} referring document(s) unlinked`);

  /* Deleted in batches. One transaction of 36 deletes is fine; one of a
     thousand is a request Sanity will refuse. */
  const BATCH = 50;
  let deleted = 0;
  for (let i = 0; i < losers.length; i += BATCH) {
    const tx = client.transaction();
    for (const id of losers.slice(i, i + BATCH)) tx.delete(id);
    await tx.commit();
    deleted += Math.min(BATCH, losers.length - i);
  }

  console.log(`  ${deleted} duplicate(s) deleted`);
  console.log(
    `\n  Re-run \`npm run nursing:publish -- --republish --reassign\` to rebuild\n` +
      `  the links that were unset. One publish at a time — running two is what\n` +
      `  created these.\n`,
  );
}

main().catch((err) => {
  console.error(`\nDedupe failed: ${err.message}\n`);
  process.exit(1);
});
