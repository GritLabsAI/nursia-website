/**
 * Stage 22 — take the written pages, check them, and put them in the store.
 *
 * The drafts live in `pipeline/nclex/content/` as TypeScript modules rather
 * than in the database, because they are written by a person and belong in
 * version control: a page that changes should show up in a diff, be reviewed,
 * and be attributable. The store is where the *state* of a page lives — planned,
 * drafted, published — which is a different thing and changes for different
 * reasons.
 *
 * Nothing gets through this stage on a warning. A page that fails a gate stays
 * `planned`, its problems are printed with the slug, and the batch continues so
 * that one bad page does not hide the other ninety-nine. The exit code is
 * non-zero if anything failed, so this can gate a publish.
 *
 *   npm run nclex:compile
 *   npm run nclex:compile -- --dry
 *   npm run nclex:compile -- --only sepsis-nursing-care
 */

import { DRAFTS } from "./content";
import {
  checkDraft,
  checkDuplication,
  draftWords,
  minutes,
  type Draft,
  type Problem,
} from "./lib/drafts";
import { openStore, type PageKind } from "./lib/store";

const DRY = process.argv.includes("--dry");
const ONLY = argOf("--only");

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main() {
  const store = openStore();
  try {
    const planned = new Map(store.pages().map((p) => [p.slug, p]));
    const drafts = (ONLY ? DRAFTS.filter((d) => d.slug === ONLY) : DRAFTS) as Draft[];

    if (!drafts.length) {
      throw new Error(
        ONLY
          ? `No draft with slug "${ONLY}" in pipeline/nclex/content/.`
          : `No drafts in pipeline/nclex/content/. Nothing to compile.`,
      );
    }

    console.log(`\nCompile`);
    console.log(`  drafts      ${drafts.length}`);
    console.log(`  planned     ${planned.size}`);

    /* A slug that was never planned is the interesting failure: it means a page
       was written against a subject the planner rejected as already covered, or
       that somebody typed the slug by hand. Either way it must not publish — a
       page with no plan row has no target query, no question set and no
       provenance. */
    const problems: Problem[] = [];
    const writable: { draft: Draft; kind: PageKind }[] = [];

    for (const draft of drafts) {
      const page = planned.get(draft.slug);
      if (!page) {
        problems.push({
          slug: draft.slug,
          gate: "unplanned",
          detail:
            `No planned page with this slug. Either the slug is a typo, or the ` +
            `subject was rejected by stage 21 — check plan-<run>.json before ` +
            `forcing it through.`,
        });
        continue;
      }
      const found = checkDraft(draft, page.kind);
      problems.push(...found);
      if (!found.length) writable.push({ draft, kind: page.kind });
    }

    /* Cross-page checks run over everything written, including the pages that
       already failed — a duplicated paragraph is a fact about the batch, and
       hiding half of it because the other page failed a word count makes the
       report misleading. */
    const duplicates = checkDuplication(drafts);
    problems.push(...duplicates);
    const duplicated = new Set(duplicates.map((p) => p.slug));

    const passing = writable.filter(({ draft }) => !duplicated.has(draft.slug));

    if (problems.length) {
      const bySlug = new Map<string, Problem[]>();
      for (const p of problems) {
        bySlug.set(p.slug, [...(bySlug.get(p.slug) ?? []), p]);
      }
      console.log(`\n  Failed      ${bySlug.size} page(s), ${problems.length} problem(s)`);
      for (const [slug, list] of bySlug) {
        console.log(`\n    ${slug}`);
        for (const p of list) console.log(`      ${p.gate.padEnd(22)} ${p.detail}`);
      }
    }

    console.log(`\n  Passed      ${passing.length} page(s)`);
    for (const { draft } of passing) {
      const n = draftWords(draft);
      console.log(
        `    ${String(n).padStart(4)}w  ${String(minutes(n)).padStart(2)}min  ${draft.slug}`,
      );
    }

    if (DRY) {
      console.log(`\n  --dry, nothing written\n`);
      process.exit(problems.length ? 1 : 0);
    }

    const now = new Date().toISOString();
    for (const { draft } of passing) {
      const n = draftWords(draft);
      store.putDraft({
        slug: draft.slug,
        shortAnswer: draft.shortAnswer,
        keyPoints: JSON.stringify(draft.keyPoints),
        sections: JSON.stringify(draft.sections),
        faqs: JSON.stringify(draft.faqs),
        examTip: draft.examTip ?? null,
        words: n,
        minutes: minutes(n),
        author: "editorial",
        status: "drafted",
        error: null,
        sanityId: null,
        createdAt: now,
        updatedAt: now,
      });

      /* Title and heading overrides live on the page row, because that is what
         the publish stage reads and what the Studio will show. Writing them
         here rather than at publish time means `--dry` on the publish stage
         shows the real title. */
      const page = planned.get(draft.slug)!;
      if (draft.title || draft.h1) {
        store.putPages([
          {
            ...page,
            title: draft.title ?? page.title,
            h1: draft.h1 ?? page.h1,
          },
        ]);
      }
      store.setPageStatus(draft.slug, "drafted");
    }

    console.log(`\n  stored      ${JSON.stringify(store.counts())}\n`);
    process.exit(problems.length ? 1 : 0);
  } finally {
    store.close();
  }
}

main();
