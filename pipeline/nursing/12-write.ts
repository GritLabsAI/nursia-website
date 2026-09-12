/**
 * Stage 12 — write the pages.
 *
 * The plan says what the thousand pages are; this turns each row into prose.
 * It is the only stage that costs money and the only one that can produce
 * something embarrassing, so nearly all of it is about those two facts.
 *
 * **Resumable, because it will be interrupted.** A run of this length meets a
 * rate limit, a laptop lid, a network drop. Every page is committed the moment
 * it exists, and the plan row moves `planned → writing → written` so a re-run
 * picks up exactly where it stopped. Rows stranded in `writing` by a kill are
 * released at startup — but only at startup, so two writers running at once
 * do not steal each other's work.
 *
 * **Batched, because the fixed cost per call is large.** Several briefs go in
 * one prompt and several pages come back. Small batches, though: a large one
 * invites a truncated response, and a truncated batch loses every page in it.
 *
 * **Gated, because a bad page is worse than no page.** Nothing reaches Sanity
 * without passing `lib/quality.ts` — length, structure, voice, and a shingle
 * check against everything already written. A failure is recorded with its
 * reasons and left for a re-run rather than published and cleaned up later.
 *
 *   npm run nursing:write
 *   npm run nursing:write -- --limit 12          # a taste before committing
 *   npm run nursing:write -- --family clinical
 *   npm run nursing:write -- --batch 3 --concurrency 6
 *   npm run nursing:write -- --retry             # only what failed before
 */

import { openNursingStore, type PageRow, type PlanRow, type PageFamily } from "./lib/store";
import { callClaude, extractJson, pool, salvageArray } from "./lib/claude";
import {
  check,
  contentHash,
  draftText,
  readingMinutes,
  shingles,
  wordCount,
  type Corpus,
  type Draft,
} from "./lib/quality";

const LIMIT = Number(argOf("--limit") ?? "0") || Infinity;
const BATCH = Math.max(1, Math.min(5, Number(argOf("--batch") ?? "3")));
const CONCURRENCY = Math.max(1, Math.min(12, Number(argOf("--concurrency") ?? "5")));
const FAMILY = argOf("--family") as PageFamily | undefined;
const MODEL = argOf("--model") ?? "sonnet";
const RETRY_ONLY = process.argv.includes("--retry");
const DRY = process.argv.includes("--dry");

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * The house style, sent once per call as a system prompt.
 *
 * Every rule here is a correction to something a language model does by
 * default when asked for an article. The negative rules outnumber the positive
 * ones because the failure mode is not that the model cannot write — it is
 * that it writes the same competent, weightless page about every subject.
 */
const SYSTEM = `You write for Nursia, a study site for nurses preparing for the NCLEX.

Voice:
- British-influenced professional English. Plain, direct, specific.
- Write to a qualified nurse or a final-year student. Never explain what a nurse is.
- Short sentences carry the weight. Vary the length; do not write in a list of clauses.
- Concrete beats general. Name the drug, the value, the sign, the number.

Never:
- Never open a section by restating its heading.
- Never write "It is important to note", "In conclusion", "plays a crucial role",
  "delve", "navigate the complexities", "when it comes to", or "a testament to".
- Never pad. If a section has three sentences of substance, write three sentences.
- Never invent a statistic, a study, a date or a citation.
- Never give individual medical advice or name a specific patient case as real.
- Never use an em dash more than once per section.

Clinical accuracy:
- Everything must be defensible against current nursing practice.
- Where practice varies by state or institution, say so rather than picking one.
- Where a value has a range, give the range.
- If you are not confident of a specific number, describe the principle instead
  of inventing a figure. An omitted number is recoverable; a wrong one is not.

Output contract:
- Reply with JSON only. No prose before it, no code fence around it.
- The JSON is an array with one object per brief, in the order the briefs came.`;

type BriefOut = {
  slug: string;
  metaDescription: string;
  shortAnswer: string;
  sections: { h2: string; body: string[] }[];
  faqs: { q: string; a: string }[];
};

function promptFor(rows: PlanRow[]): string {
  const briefs = rows.map((r, i) => {
    const outline = safeArray(r.outline);
    const secondary = safeArray(r.secondary);
    const facts = safeArray(r.facts);

    return `### Brief ${i + 1}
slug:          ${r.slug}
title:         ${r.title}
page heading:  ${r.h1}
kind:          ${r.family}${r.entity ? ` — about "${r.entity}"` : ""}
primary query: ${r.primaryQuery}
also answers:  ${secondary.slice(0, 5).join("; ") || "(none)"}

The angle — the thing this page says that a generic page would not:
${r.angle}
${facts.length ? `\nFacts you must use and must not contradict:\n${facts.map((f) => `- ${f}`).join("\n")}` : ""}

Sections to write, in this order, using these headings:
${outline.map((h, n) => `${n + 1}. ${h}`).join("\n")}`;
  });

  return `Write ${rows.length} page${rows.length > 1 ? "s" : ""} for the Nursia nursing library.

For each brief return an object:
{
  "slug": "<copy the slug exactly>",
  "metaDescription": "<under 160 characters, says what the page answers, no brand name>",
  "shortAnswer": "<40-70 words. Answer the query outright in the first sentence, then qualify. Written to survive being lifted whole into a search snippet or read aloud.>",
  "sections": [{ "h2": "<the heading from the brief, verbatim>", "body": ["<paragraph>", "<paragraph>"] }],
  "faqs": [{ "q": "<a question a nurse actually types>", "a": "<2-4 sentences, answered directly>" }]
}

Length: 130-220 words per section, 3-5 FAQs, 700-1000 words in total per page.
Each body paragraph is a plain string. No markdown, no bullet characters, no
headings inside the body — the site renders structure from the JSON.

The sections are given to you as headings. Use them verbatim, in order. What
goes under them is yours, and it must be specific to this subject: if a
paragraph would read identically on a page about a different condition, it is
the wrong paragraph.

${briefs.join("\n\n")}

Return the JSON array now. ${rows.length} object${rows.length > 1 ? "s" : ""}, in brief order.`;
}

function safeArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

async function main() {
  const store = openNursingStore();

  /* Stranded rows are released once, at startup, before anything is claimed.
     Doing it per batch would let a second writer started five minutes later
     reclaim the first one's in-flight work. */
  const released = store.releaseStranded();
  if (released) console.log(`  released    ${released} row(s) stranded by a previous run`);

  const queue = store
    .pending(Number.isFinite(LIMIT) ? LIMIT : 100_000, FAMILY)
    .filter((r) => (RETRY_ONLY ? r.status === "failed" : true));

  if (!queue.length) {
    console.log("\nNothing to write. Every planned page is written or published.\n");
    store.close();
    return;
  }

  /* The duplicate check needs everything written so far, including pages from
     earlier runs — that is the whole point of it surviving a restart. */
  const corpus: Corpus = store.pages().map((p) => ({
    slug: p.slug,
    shingles: shingles(
      [
        p.shortAnswer,
        ...JSON.parse(p.sections).flatMap((s: { body: string[] }) => s.body),
      ].join(" "),
    ),
  }));

  const batches: PlanRow[][] = [];
  for (let i = 0; i < queue.length; i += BATCH) batches.push(queue.slice(i, i + BATCH));

  console.log(`\nWrite`);
  console.log(`  queued      ${queue.length} pages${FAMILY ? ` (family: ${FAMILY})` : ""}`);
  console.log(`  batches     ${batches.length} of up to ${BATCH}, ${CONCURRENCY} at a time`);
  console.log(`  model       ${MODEL}`);
  console.log(`  corpus      ${corpus.length} already written\n`);

  if (DRY) {
    console.log("  --- prompt for the first batch ---\n");
    console.log(promptFor(batches[0]).slice(0, 2400));
    console.log("\n  dry run — nothing called, nothing written\n");
    store.close();
    return;
  }

  const started = Date.now();
  let written = 0;
  let failed = 0;
  let rejected = 0;
  let cost = 0;

  await pool(batches, CONCURRENCY, async (rows, index) => {
    const slugs = rows.map((r) => r.slug);
    store.claim(slugs);

    try {
      const res = await callClaude(promptFor(rows), {
        model: MODEL,
        systemPrompt: SYSTEM,
        timeoutMs: 420_000,
      });
      cost += res.costUsd;

      /* Parse, and fall back to salvage if the response was cut off. A batch
         that came back three-and-a-half pages complete should yield three
         pages, not nothing — see `salvageArray`. */
      let list: BriefOut[];
      try {
        const drafts = extractJson<BriefOut[]>(res.text);
        list = Array.isArray(drafts) ? drafts : [drafts];
      } catch (parseError) {
        list = salvageArray<BriefOut>(res.text);
        if (!list.length) throw parseError;
        console.log(
          `  … batch ${index + 1} truncated — salvaged ${list.length} of ${rows.length}`,
        );
      }

      /* Matched by slug, not by position. The model is asked for brief order
         and mostly obliges, but a batch where it reorders two pages would
         otherwise publish each one's content under the other's title — a
         failure that passes every quality check and is only visible by
         reading the site. */
      const bySlug = new Map(list.map((d) => [String(d.slug ?? "").trim(), d]));

      for (const row of rows) {
        const draft = bySlug.get(row.slug);
        if (!draft) {
          store.setPlanStatus(row.slug, "failed");
          failed++;
          console.log(`  ✗ ${row.slug} — not in the response`);
          continue;
        }

        const normalised: Draft = {
          slug: row.slug,
          metaDescription: String(draft.metaDescription ?? "").trim(),
          shortAnswer: String(draft.shortAnswer ?? "").trim(),
          sections: (draft.sections ?? [])
            .filter((s) => s && s.h2)
            .map((s) => ({
              h2: String(s.h2).trim(),
              body: (Array.isArray(s.body) ? s.body : [s.body])
                .map((b) => String(b ?? "").trim())
                .filter(Boolean),
            })),
          faqs: (draft.faqs ?? [])
            .filter((f) => f && f.q && f.a)
            .map((f) => ({ q: String(f.q).trim(), a: String(f.a).trim() })),
        };

        const report = check(normalised, corpus);
        const words = wordCount(draftText(normalised));
        const now = new Date().toISOString();

        const page: PageRow = {
          slug: row.slug,
          title: row.title,
          h1: row.h1,
          family: row.family,
          nursingTopic: row.nursingTopic,
          metaDescription: normalised.metaDescription,
          shortAnswer: normalised.shortAnswer,
          sections: JSON.stringify(normalised.sections),
          faqs: JSON.stringify(normalised.faqs),
          readNext: "[]",
          words,
          minutes: readingMinutes(words),
          model: res.model,
          contentHash: contentHash(normalised),
          quality: JSON.stringify(report),
          status: report.ok ? "written" : "rejected",
          error: report.ok ? null : report.issues.join("; "),
          sanityId: null,
          createdAt: now,
          updatedAt: now,
        };

        store.putPage(page);

        if (report.ok) {
          /* Into the corpus immediately, so the next batch in this same run is
             checked against it. Waiting until the end would let a whole run
             produce duplicates of itself. */
          corpus.push({ slug: row.slug, shingles: shingles(draftText(normalised)) });
          store.setPlanStatus(row.slug, "written");
          written++;
        } else {
          /* Left as `failed` rather than `rejected` so a re-run tries again —
             most rejections are a short section or a stray banned phrase, and
             a second attempt usually clears them. The reasons are kept on the
             page row either way. */
          store.setPlanStatus(row.slug, "failed");
          rejected++;
          console.log(`  ~ ${row.slug} — ${report.issues.join("; ")}`);
        }
      }

      const done = written + rejected + failed;
      const rate = done / ((Date.now() - started) / 60_000);
      console.log(
        `  [${String(index + 1).padStart(4)}/${batches.length}] ` +
          `${written} written, ${rejected} held, ${failed} failed · ` +
          `$${cost.toFixed(2)} · ${rate.toFixed(1)}/min · ` +
          `eta ${Math.round((queue.length - done) / Math.max(rate, 0.1))}m`,
      );
    } catch (err) {
      for (const row of rows) {
        store.setPlanStatus(row.slug, "failed");
        failed++;
      }
      console.log(`  ✗ batch ${index + 1} (${slugs.length} pages) — ${(err as Error).message}`);
    }
  });

  const minutes = (Date.now() - started) / 60_000;
  console.log(`\n  Written     ${written}`);
  console.log(`  Held back   ${rejected} (below the quality bar — re-run to retry)`);
  console.log(`  Failed      ${failed}`);
  console.log(`  Cost        $${cost.toFixed(2)} over ${minutes.toFixed(1)} minutes`);
  console.log(`  Store       ${JSON.stringify(store.counts())}\n`);

  store.close();
}

main().catch((err) => {
  console.error(`\nWrite failed: ${err.message}\n`);
  process.exit(1);
});
