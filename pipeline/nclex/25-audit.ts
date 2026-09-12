/**
 * Stage 25 — what is broken, and what is quietly underperforming.
 *
 *   ERROR   the page is wrong or unreachable — no question set, no sections,
 *           a duplicate slug, a promise it cannot keep.
 *   WARN    the page works and is underperforming — no offer on it, nothing
 *           linking to it, thin, stale.
 *
 * Exits non-zero on errors so it can gate a deploy. The warnings are the half
 * worth reading on a schedule: a page with no free resource is indistinguishable
 * from a finished page in every view except this one, and "nothing links here"
 * only starts happening months later, which is exactly when nobody looks.
 *
 * Runs against Sanity rather than the local store on purpose. The store says
 * what the pipeline believes it published; this stage has to answer what is
 * actually live, including anything an editor has since changed by hand.
 *
 *   npm run nclex:audit
 */

import { writeClient } from "../lib/sanity";

/** Whole-page prose below this reads as a stub to a reader and to a crawler. */
const THIN_WORDS = 450;
/** Six months. Long enough that a real refresh is due, short enough to act on. */
const STALE_DAYS = 182;

type Row = {
  _id: string;
  slug: string | null;
  title: string | null;
  kind: string | null;
  examCategory: string | null;
  updatedAt: string | null;
  minutes: number | null;
  topic: string | null;
  hasResource: boolean;
  sections: number;
  keyPoints: number;
  faqs: number;
  inbound: number;
  /* Counted from the blocks themselves rather than with pt::text, which does
     not flatten an array *of arrays* of blocks and silently returns a fraction
     of the page — reporting every page as thin. That cost an afternoon on the
     guide pipeline; it is written down here so it costs nobody else one. */
  words: number;
};

async function main() {
  const client = writeClient();

  const rows = await client.fetch<Row[]>(`*[_type == "seoPage"]{
    _id,
    "slug": slug.current,
    title,
    kind,
    examCategory,
    updatedAt,
    minutes,
    "topic": topic->slug.current,
    "hasResource": defined(leadMagnet),
    "sections": count(sections),
    "keyPoints": count(keyPoints),
    "faqs": count(faqs),
    "inbound": count(*[_type in ["seoPage", "guide"] && references(^._id)]),
    "words": count(
      string::split(
        array::join(sections[].body[].children[].text, " "),
        " "
      )
    )
  }`);

  const errors: string[] = [];
  const warnings: string[] = [];

  const bySlug = new Map<string, number>();
  for (const r of rows) {
    if (!r.slug) {
      errors.push(`${r._id} has no slug — it is unreachable.`);
      continue;
    }
    bySlug.set(r.slug, (bySlug.get(r.slug) ?? 0) + 1);
  }
  for (const [slug, n] of bySlug) {
    if (n > 1) {
      errors.push(`/nclex-review/${slug} is the slug of ${n} documents — one of them is unreachable.`);
    }
  }

  const staleBefore = new Date(Date.now() - STALE_DAYS * 864e5).toISOString().slice(0, 10);

  for (const r of rows) {
    const at = r.slug ? `/nclex-review/${r.slug}` : r._id;

    if (!r.topic) {
      /* The page promises practice in its own template and in its schema. With
         no question set behind it, that promise is a broken link. */
      errors.push(`${at} has no question set — the "practise this" rail has nowhere to send anyone.`);
    }
    if (!r.sections || r.sections < 2) {
      errors.push(`${at} has ${r.sections ?? 0} section(s).`);
    }
    if (!r.keyPoints || r.keyPoints < 3) {
      errors.push(`${at} has ${r.keyPoints ?? 0} key point(s); the page renders a takeaway list.`);
    }

    if (!r.hasResource) {
      warnings.push(`${at} has no free resource — it ranks and collects nobody.`);
    }
    if (r.inbound === 0) {
      warnings.push(`${at} has no inbound links — run \`npm run nclex:link\`.`);
    }
    if (r.words && r.words < THIN_WORDS) {
      warnings.push(`${at} is ${r.words} words of body copy (floor ${THIN_WORDS}).`);
    }
    if (!r.faqs) {
      warnings.push(`${at} has no FAQs — the long-tail phrasings have nowhere to live.`);
    }
    if (r.updatedAt && r.updatedAt < staleBefore) {
      warnings.push(`${at} was last updated ${r.updatedAt}.`);
    }
  }

  const byCategory = new Map<string, number>();
  for (const r of rows) {
    const c = r.examCategory ?? "uncategorised";
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }

  console.log(`\nAudit`);
  console.log(`  pages         ${rows.length}`);
  console.log(
    `  with an offer ${rows.filter((r) => r.hasResource).length}/${rows.length}`,
  );
  console.log(
    `  linked to     ${rows.filter((r) => r.inbound > 0).length}/${rows.length}`,
  );
  const totalWords = rows.reduce((n, r) => n + (r.words ?? 0), 0);
  console.log(
    `  body copy     ${totalWords.toLocaleString()} words, ${Math.round(totalWords / Math.max(rows.length, 1))} on average`,
  );

  console.log(`\n  By category`);
  for (const [category, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}  ${category}`);
  }

  if (errors.length) {
    console.log(`\n  ERRORS (${errors.length})`);
    for (const e of errors) console.log(`    ${e}`);
  }
  if (warnings.length) {
    console.log(`\n  WARNINGS (${warnings.length})`);
    for (const w of warnings.slice(0, 40)) console.log(`    ${w}`);
    if (warnings.length > 40) console.log(`    …and ${warnings.length - 40} more`);
  }
  if (!errors.length && !warnings.length) {
    console.log(`\n  Nothing to report.`);
  }
  console.log();

  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nAudit failed: ${err.message}\n`);
  process.exit(1);
});
