/**
 * Stage 21 — turn a thousand keywords into a hundred pages worth writing.
 *
 * The export contains 996 queries. It does not contain 996 pages, and treating
 * it as though it did is the single most expensive mistake available here.
 * Eight of those rows are "NCLEX review for Lab Values", "NCLEX practice Lab
 * Values", "NCLEX high yield Lab Values", "NCLEX must know Lab Values" and so
 * on. They are one subject with eight phrasings. Publishing eight pages for
 * them produces eight pages that compete with each other for the same result,
 * split the authority between them, and rank worse than the one page would
 * have.
 *
 * So this stage does three things, in order, and each one throws work away:
 *
 *   1. **Collapse** queries into families by subject. The best-scoring phrasing
 *      becomes the page; the rest become its secondary queries, which is where
 *      they belong — they are FAQ headings and body phrasings, not URLs.
 *   2. **Reject** families the library already answers, by IDF-weighted overlap
 *      against every existing guide. A new page that duplicates
 *      /guides/how-to-answer-sata does not add traffic, it divides it.
 *   3. **Rank and cap.** Score by the family's combined volume, its commercial
 *      value and its difficulty, then cap how many pages may point at any one
 *      question set — forty pages behind one practice set is a cluster with one
 *      offer repeated forty times.
 *
 * Nothing here writes to Sanity. It writes rows to the local store with status
 * `planned`, which is the work queue the next stage reads.
 *
 *   npm run nclex:plan
 *   npm run nclex:plan -- --dry
 *   npm run nclex:plan -- --take 100 --max-per-topic 12
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@sanity/client";
import { buildIdf, similarity, tokenSet } from "./lib/similarity";
import {
  clusterFor,
  kindFor,
  questionTopicFor,
  slugFor,
  type QuestionTopic,
} from "./lib/taxonomy";
import { openStore, type KeywordRow, type PageKind, type PageRow } from "./lib/store";

const DRY = process.argv.includes("--dry");
const TAKE = Number(argOf("--take") ?? 100);
const MAX_PER_TOPIC = Number(argOf("--max-per-topic") ?? 12);

/**
 * Where token overlap stops being a coincidence.
 *
 * 0.65, the same threshold the guide pipeline settled on against the same
 * library. It is a judgement, not a constant of nature: at 0.5 genuinely
 * different subjects get rejected as duplicates, and at 0.8 "nclex questions on
 * delegation" and "nclex questions about delegation" both get written.
 */
const COVERED_AT = 0.65;

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const RUN = `run-${new Date().toISOString().slice(0, 10)}`;

/**
 * The phrasings wrapped around a subject, stripped to leave the subject.
 *
 * Ordered longest-pattern-first, because "NCLEX questions about X" must be
 * tried before "NCLEX questions X" or the word "about" survives into the
 * subject and splits a family in two.
 */
const WRAPPERS: RegExp[] = [
  /^how to answer (.+?) nclex questions$/i,
  /^how to use (.+?) on nclex$/i,
  /^nclex (.+?) practice questions with rationales$/i,
  /^nclex (.+?) questions practice$/i,
  /^nclex (.+?) nursing considerations$/i,
  /^nclex (.+?) patient teaching$/i,
  /^nclex (.+?) side effects$/i,
  /^nclex (.+?) nursing care$/i,
  /^nclex (.+?) strategy$/i,
  /^complete (.+?) nclex study guide$/i,
  /^nclex questions on (.+)$/i,
  /^nclex questions about (.+)$/i,
  /^nclex questions (.+)$/i,
  /^nclex review for (.+)$/i,
  /^nclex tips for (.+)$/i,
  /^nclex study guide (.+)$/i,
  /^nclex practice (.+)$/i,
  /^nclex strategies (.+)$/i,
  /^nclex mnemonics (.+)$/i,
  /^nclex high yield (.+)$/i,
  /^nclex must know (.+)$/i,
  /^nclex prep (.+)$/i,
  /^(.+?) for nclex$/i,
];

/** The subject a query is about, with the packaging removed. */
function subjectOf(query: string): string {
  for (const pattern of WRAPPERS) {
    const m = pattern.exec(query.trim());
    if (m?.[1]) return m[1].trim();
  }
  return query.replace(/^nclex\s+/i, "").trim();
}

/**
 * How the subject is written on the page.
 *
 * The export capitalises inconsistently ("Lab Values", "Med Surg", "MI") and
 * some subjects are abbreviations that must stay upper-case in a heading. Left
 * as the export wrote it, minus the parenthetical glosses that belong in the
 * body rather than in a title.
 */
function displaySubject(subject: string): string {
  return subject
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Family = {
  key: string;
  subject: string;
  primary: KeywordRow;
  members: KeywordRow[];
  /** Every phrasing in the family, the primary first. */
  queries: string[];
  volume: number;
  score: number;
  topic: QuestionTopic;
  kind: PageKind;
};

async function main() {
  const store = openStore();
  try {
    const keywords = store.keywords();
    if (!keywords.length) {
      throw new Error(
        `No keywords in the store. Run \`npm run nclex:ingest\` first.`,
      );
    }

    console.log(`\nPlan`);
    console.log(`  run         ${RUN}`);
    console.log(`  keywords    ${keywords.length}`);

    /* ------------------------------------------------------- 1. collapse */

    const families = new Map<string, Family>();
    let unmapped = 0;

    for (const kw of keywords) {
      const subject = displaySubject(subjectOf(kw.keyword));
      const topic = questionTopicFor(kw.keyword, kw.category);
      if (!topic) {
        /* No question set means no offer, and a page whose practice link is a
           guess is worse than no page. Counted, not silently dropped. */
        unmapped++;
        continue;
      }

      const key = [...tokenSet(subject)].sort().join(" ");
      if (!key) {
        unmapped++;
        continue;
      }

      const existing = families.get(key);
      if (!existing) {
        families.set(key, {
          key,
          subject,
          primary: kw,
          members: [kw],
          queries: [kw.keyword],
          volume: kw.volume,
          score: 0,
          topic,
          kind: kindFor(kw.keyword, kw.intent, kw.category),
        });
        continue;
      }

      existing.members.push(kw);
      existing.queries.push(kw.keyword);
      existing.volume += kw.volume;
      /* The highest-volume phrasing decides the page: its wording becomes the
         title, its intent decides the body shape, and its category decides the
         practice link. The others are the same page asked differently. */
      if (kw.volume > existing.primary.volume) {
        existing.primary = kw;
        existing.subject = subject;
        existing.kind = kindFor(kw.keyword, kw.intent, kw.category);
        existing.topic = topic;
      }
    }

    for (const family of families.values()) {
      family.queries.sort((a, b) =>
        a === family.primary.keyword ? -1 : b === family.primary.keyword ? 1 : 0,
      );
      family.score = scoreFamily(family);
    }

    const collapsed = keywords.length - families.size - unmapped;
    console.log(`  families    ${families.size} (${collapsed} phrasings folded in)`);
    if (unmapped) console.log(`  unmapped    ${unmapped} rows with no question set`);

    /* ----------------------------------------- 2. reject what we cover */

    const existing = await existingPages();
    console.log(`  library     ${existing.length} pages already published`);

    const docs = existing.map((p) => tokenSet(`${p.title} ${p.slug}`));
    const idf = buildIdf(docs);

    const candidates = [...families.values()].sort((a, b) => b.score - a.score);
    const rejected: { subject: string; by: string; similarity: number; volume: number }[] = [];
    const eligible: Family[] = [];

    for (const family of candidates) {
      const tokens = tokenSet(family.subject);
      let bestIndex = -1;
      let bestSim = -1;

      docs.forEach((doc, i) => {
        const sim = similarity(tokens, doc, idf);
        /* Ties broken toward the more focused page, so an audit of a rejection
           names the page a reader would actually have been sent to. */
        const better =
          sim > bestSim || (sim === bestSim && bestIndex >= 0 && doc.size < docs[bestIndex].size);
        if (better) {
          bestIndex = i;
          bestSim = sim;
        }
      });

      if (bestIndex >= 0 && bestSim >= COVERED_AT) {
        rejected.push({
          subject: family.subject,
          by: existing[bestIndex].slug,
          similarity: bestSim,
          volume: family.volume,
        });
        continue;
      }
      eligible.push(family);
    }

    console.log(`  rejected    ${rejected.length} already answered by the library`);
    for (const r of rejected.sort((a, b) => b.volume - a.volume).slice(0, 6)) {
      console.log(
        `    ${String(r.volume).padStart(5)}  ${r.subject.padEnd(34)} ${r.by} (${r.similarity.toFixed(2)})`,
      );
    }
    if (rejected.length > 6) console.log(`    …and ${rejected.length - 6} more`);

    /* ------------------------------------------------ 3. rank and cap */

    const selected: Family[] = [];
    const perTopic = new Map<QuestionTopic, number>();
    const accepted: Set<string>[] = [];
    const skippedCollision: { subject: string; against: string; similarity: number }[] = [];
    const skippedCap: string[] = [];

    for (const family of eligible) {
      if (selected.length >= TAKE) break;

      const used = perTopic.get(family.topic) ?? 0;
      if (used >= MAX_PER_TOPIC) {
        skippedCap.push(family.subject);
        continue;
      }

      /* The second dedupe, and the one that catches what family keys cannot:
         "Fluid and Electrolytes", "Electrolyte Imbalances" and "Electrolytes"
         are three different token sets and one subject. Compared against what
         this run has already accepted rather than against the library. */
      const tokens = tokenSet(family.subject);
      let collidedAt = -1;
      let collidedWith = "";
      accepted.forEach((doc, i) => {
        const sim = similarity(tokens, doc, idf);
        if (sim >= COVERED_AT && sim > collidedAt) {
          collidedAt = sim;
          collidedWith = selected[i].subject;
        }
      });
      if (collidedAt >= COVERED_AT) {
        skippedCollision.push({
          subject: family.subject,
          against: collidedWith,
          similarity: collidedAt,
        });
        continue;
      }

      selected.push(family);
      accepted.push(tokens);
      perTopic.set(family.topic, used + 1);
    }

    console.log(
      `\n  Planned     ${selected.length} pages` +
        `${skippedCollision.length ? `, ${skippedCollision.length} folded into an earlier page this run` : ""}` +
        `${skippedCap.length ? `, ${skippedCap.length} held back by the per-topic cap` : ""}`,
    );

    const byTopic = [...perTopic].sort((a, b) => b[1] - a[1]);
    for (const [topic, n] of byTopic) {
      console.log(`    ${String(n).padStart(3)}  ${topic}`);
    }

    const now = new Date().toISOString();
    const rows: PageRow[] = selected.map((f) => {
      const subject = f.subject;
      return {
        slug: slugFor(subject, f.kind),
        title: titleFor(subject, f.kind),
        h1: h1For(subject, f.kind),
        kind: f.kind,
        examCategory: f.primary.category,
        primaryQuery: f.primary.keyword,
        secondary: JSON.stringify(f.queries.filter((q) => q !== f.primary.keyword)),
        volume: f.volume,
        keywordDifficulty: f.primary.keywordDifficulty,
        cpc: f.primary.cpc,
        intent: f.primary.intent,
        questionTopic: f.topic,
        cluster: clusterFor(f.primary.category),
        angle: angleFor(subject, f.kind),
        status: "planned",
        dedupeOf: null,
        score: Math.round(f.score),
        runId: RUN,
        createdAt: now,
      };
    });

    /* A slug collision would silently overwrite a planned page, so it stops the
       run — two rows in one batch resolving to the same URL means the slug rule
       is wrong, and continuing publishes one page and loses the other. */
    const slugs = new Set<string>();
    for (const row of rows) {
      if (slugs.has(row.slug)) {
        throw new Error(
          `Two planned pages resolve to /nclex-review/${row.slug}. ` +
            `Fix slugFor() in lib/taxonomy.ts rather than dropping one.`,
        );
      }
      slugs.add(row.slug);
    }

    console.log(`\n  Top of the plan`);
    for (const row of rows.slice(0, 12)) {
      console.log(
        `    ${String(row.score).padStart(5)}  ${row.title.slice(0, 52).padEnd(54)} /nclex-review/${row.slug}`,
      );
    }

    const out = resolve(`pipeline/nclex/data/plan-${RUN}.json`);
    if (DRY) {
      console.log(`\n  --dry, nothing written\n`);
      return;
    }

    store.startRun(RUN, "plan", `${rows.length} pages`);
    store.putPages(rows);
    store.finishRun(RUN, "plan", `${rows.length} pages`);

    /*
     * The rejections are written down as well as the selections, and they are
     * the more useful half later. Once a page exists, its query stops producing
     * a plan row — it is covered now, which is the dedupe working — so this file
     * is the only record of what the market looked like when the decision was
     * made, and of which subjects were held back rather than dismissed.
     */
    await writeFile(
      out,
      JSON.stringify(
        {
          runId: RUN,
          generatedAt: now,
          coveredAt: COVERED_AT,
          take: TAKE,
          maxPerTopic: MAX_PER_TOPIC,
          note:
            "Volumes are the export's own estimates, summed across every " +
            "phrasing folded into the page. They rank subjects against each " +
            "other; they are not a traffic forecast.",
          selected: rows.map((r) => ({
            slug: r.slug,
            title: r.title,
            kind: r.kind,
            topic: r.questionTopic,
            score: r.score,
            volume: r.volume,
            primaryQuery: r.primaryQuery,
            secondary: JSON.parse(r.secondary),
          })),
          rejectedAsCovered: rejected,
          foldedIntoEarlierPage: skippedCollision,
          heldBackByTopicCap: skippedCap,
        },
        null,
        2,
      ) + "\n",
    );

    console.log(`\n  stored      ${JSON.stringify(store.counts())}`);
    console.log(`  plan        ${out}\n`);
  } finally {
    store.close();
  }
}

/* --------------------------------------------------------------- scoring */

/** Conversion potential, as the export grades it. */
const CONVERSION: Record<string, number> = { High: 1.25, Medium: 1.0, Low: 0.8 };

/**
 * What a family is worth writing.
 *
 * Combined volume is the base, because a page that legitimately answers eight
 * phrasings is worth more than its best single phrasing suggests. Commercial
 * value and conversion potential lift it — this programme exists to produce
 * signups, not sessions. Difficulty discounts it rather than disqualifying it:
 * a hard subject with real volume is still worth writing, it just should not
 * outrank an easy one of the same size.
 *
 * Deliberately not a traffic forecast. It ranks subjects against each other and
 * nothing more; the volumes underneath it are somebody's estimates.
 */
function scoreFamily(f: Family): number {
  const conversion = CONVERSION[f.primary.conversionPotential] ?? 1;
  /* A dollar of CPC is evidence somebody is paying to reach this reader. Held
     to a gentle curve so a $8 keyword does not outrank a subject eight times
     its size. */
  const commercial = 1 + Math.min(f.primary.cpc, 8) / 16;
  const difficulty = 1 - Math.min(f.primary.keywordDifficulty, 90) / 200;
  return f.volume * conversion * commercial * difficulty;
}

/* ------------------------------------------------------------- wording */

/**
 * Titles and headings, per page kind.
 *
 * Templated, and that is a real cost: a hundred titles built from five patterns
 * read as a hundred titles built from five patterns. It is accepted here
 * because the alternative — a unique title per page invented at plan time —
 * would be invented by a scoring script with no idea what the page will say.
 * The heading is the honest, human half and the writer is free to change both;
 * these are the defaults that make the row publishable, not the final word.
 */
function titleFor(subject: string, kind: PageKind): string {
  const t = {
    practice: `${subject} NCLEX Practice Questions`,
    review: `${subject} for the NCLEX`,
    clinical: `${subject}: NCLEX Nursing Care`,
    medication: `${subject}: NCLEX Nursing Considerations`,
    strategy: `${subject} on the NCLEX`,
  }[kind];
  return t.length <= 70 ? t : `${subject}`.slice(0, 70);
}

function h1For(subject: string, kind: PageKind): string {
  const h = {
    practice: `${subject} NCLEX questions, and how the exam asks them`,
    review: `${subject} for the NCLEX: what is actually tested`,
    clinical: `${subject} nursing care: what the NCLEX expects you to do first`,
    medication: `${subject} on the NCLEX: what to watch, what to teach`,
    strategy: `Using ${subject} to answer NCLEX questions`,
  }[kind];
  return h.length <= 90 ? h : h.slice(0, 87).replace(/\s\S*$/, "…");
}

/**
 * The promise the page has to keep. The anti-slop field.
 *
 * Written as an instruction to whoever drafts it, and checked by the compile
 * stage's gates: a practice page with no stem pattern in it has not kept this
 * promise and does not publish.
 */
function angleFor(subject: string, kind: PageKind): string {
  return {
    practice: `Show how the exam asks about ${subject}: the stem patterns, the distractor that catches most candidates, and the rule that resolves it. Not a summary of the topic.`,
    review: `Name what is actually tested about ${subject} and what is not, with the numbers and thresholds the exam repeats. Cut everything a textbook would include and the exam never asks.`,
    clinical: `Lead with the assessment that changes the answer for ${subject}, then the intervention order. The reader wants to know what to do first and why the obvious answer is second.`,
    medication: `What kills the patient, what to hold the dose for, and what the teaching point is for ${subject}. Mechanism only where it explains the nursing action.`,
    strategy: `Show ${subject} resolving a question a reader would otherwise get wrong, then name where the rule stops working. A strategy page with no worked question is a slogan.`,
  }[kind];
}

/* ----------------------------------------------------------- the library */

/**
 * Everything already published, for the dedupe.
 *
 * Read-only and with the read token rather than the write one: a planning stage
 * has no business holding a credential that can rewrite the content lake.
 */
async function existingPages(): Promise<{ slug: string; title: string }[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (!projectId || !dataset) {
    throw new Error(
      `NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET must be ` +
        `set. Run through the npm script, which passes --env-file=.env.local.`,
    );
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-02-01",
    token: process.env.SANITY_API_READ_TOKEN,
    useCdn: false,
  });

  /* Both document types. A new review page must not duplicate a guide, and on
     the second run it must not duplicate a review page from the first. */
  return client.fetch<{ slug: string; title: string }[]>(
    `*[_type in ["guide", "seoPage"] && defined(slug.current)]{
       "slug": slug.current, title
     }`,
  );
}

main().catch((err) => {
  console.error(`\nPlanning failed: ${err.message}\n`);
  process.exit(1);
});
