/**
 * Stage 2 — decide what to write next.
 *
 * Takes whatever the configured trends source hands back, throws away every
 * query the library already answers, and ranks what is left. The output is a
 * briefs file: a ranked, reasoned list of pages worth writing, with the
 * evidence attached to each one.
 *
 * The interesting part is the dedupe, because it is the part that decides
 * whether a content programme compounds or eats itself. Publishing a second
 * page about a query you already rank for does not double the traffic — the
 * two pages compete, the weaker one wins some of the impressions, and the
 * cluster gets worse. So a query is only a brief if nothing already covers it.
 *
 * Coverage is judged by IDF-weighted token overlap against the existing
 * titles and slugs rather than by exact match. That matters here more than it
 * would elsewhere: nearly every query in this category contains the word
 * "nclex", so plain word overlap would decide that everything is covered by
 * everything. Weighting by inverse document frequency makes "nclex" worth
 * almost nothing and "accommodations" worth a great deal, which is the right
 * way round. The matcher shows its working — every rejection names the guide
 * that beat it and the score — so a wrong call is visible rather than silent.
 *
 *   npm run seo:research
 *   TRENDS_SOURCE=google npm run seo:research
 *   TRENDS_SOURCE=csv TRENDS_CSV=./export.csv npm run seo:research
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { KeywordObservation, Trajectory } from "./lib/trends";
import { candidateQueries, resolveSource } from "./lib/trends";
import { runId, writeClient } from "./lib/sanity";

const DATASET = resolve("pipeline/data/keywords-2026-09.json");
const RUN = runId();

/** How many briefs to emit. Overridable: `npm run seo:research -- --take 12`. */
const TAKE = Number(
  process.argv[process.argv.indexOf("--take") + 1] || "",
) || 5;

/**
 * Above this, a query counts as already answered.
 *
 * Tuned by hand against the real library rather than picked round. At 0.5 it
 * called "nclex for nigerian nurses" covered by the Filipino guide, which is
 * wrong — the whole value of that page is the part that is not shared. At 0.8
 * it let near-duplicates through. 0.65 separates them.
 */
const COVERED_AT = 0.65;

/** What each direction of travel is worth. */
const TRAJECTORY_WEIGHT: Record<Trajectory, number> = {
  rising: 1.25,
  /* Seasonal is not a penalty. A query that triples every June is worth
     owning before June, and the page keeps earning every year after. */
  seasonal: 1.1,
  steady: 1,
  /* Not zero: a declining query can still be worth answering if the volume is
     large and the decline is slow. It just has to clear a higher bar. */
  declining: 0.55,
};

type Brief = {
  query: string;
  slug: string;
  score: number;
  interest: number;
  trajectory: Trajectory;
  related: string[];
  source: string;
  observedAt: string;
  /** Why the query matters — editorial, from the candidate file. */
  note?: string;
  /** How the number was arrived at — from the source that measured it. */
  measurement?: string;
  nearest: { slug: string; similarity: number } | null;
};

async function main() {
  const client = writeClient();

  /* Coverage is judged against Sanity, not against the TypeScript files —
     after stage 1 that is where the library lives, and a page added by hand in
     the Studio has to count as coverage too or the pipeline will cheerfully
     recommend writing it again. */
  const existing = await client.fetch<
    { slug: string; title: string; primaryQuery: string | null }[]
  >(`*[_type == "guide"]{
       "slug": slug.current,
       title,
       "primaryQuery": research.primaryQuery
     }`);

  if (!existing.length) {
    throw new Error(
      "No guides in Sanity. Run `npm run seo:migrate` first — otherwise every " +
        "query looks uncovered and the pipeline will recommend rewriting the " +
        "entire library.",
    );
  }

  /* The candidate list and the numbers come from different places on purpose.
     The candidates are editorial — a committed, reviewed set of queries worth
     asking about, each with the reasoning attached. The numbers are whatever
     the configured source says about those candidates today. Feeding the
     existing guide *titles* in as candidates, which an earlier version of this
     did, measures what we have already written rather than what we might. */
  const candidates = await candidateQueries(DATASET);
  const notes = new Map(candidates.map((c) => [c.query, c.note]));

  const source = await resolveSource(DATASET);

  console.log(`\nResearch (${RUN})`);
  console.log(`  source      ${source.name}`);
  console.log(`  candidates  ${candidates.length} queries`);
  console.log(`  library     ${existing.length} guides\n`);

  /* Candidates go in whole, observations come back keyed by the real query.
     Probe substitution belongs to the source, not here: only the source knows
     whether it needs one at all — a keyword-tool CSV reports on the long-tail
     phrase directly and has no use for a head-term proxy — and keying the work
     by probe there also stops two candidates that share one probe being
     measured twice. */
  const measured = await source.observe(candidates);

  /* Keep the editorial note over whatever the source wrote. It says why the
     query matters, which no trend number can, and the source's own note is
     kept alongside as the record of how the number was obtained. */
  const observations = measured.map((o) => ({
    ...o,
    note: notes.get(o.query) ?? o.note,
    measurement: o.note,
  }));

  console.log(`\n  measured    ${observations.length} of ${candidates.length}\n`);

  /* IDF over the existing library: a token in many guides carries little
     signal, a token in one carries a lot. */
  const docs = existing.map((g) =>
    tokenSet(`${g.title} ${g.slug} ${g.primaryQuery ?? ""}`),
  );
  const idf = buildIdf(docs);

  const briefs: Brief[] = [];
  const rejected: {
    query: string;
    by: string;
    similarity: number;
    interest: number;
    trajectory: Trajectory;
    measurement?: string;
  }[] = [];

  for (const obs of observations) {
    const queryTokens = tokenSet(obs.query);
    let bestIndex = -1;
    let bestSim = -1;

    docs.forEach((doc, i) => {
      const sim = similarity(queryTokens, doc, idf);
      /* Ties are common at the top — a query whose every token appears in two
         guides scores 1.00 against both. Break towards the more focused guide,
         because "how many questions is the nclex" being attributed to
         `how-many-practice-questions-before-nclex` is technically a tie and
         practically the wrong answer for anyone auditing a rejection. */
      const better =
        sim > bestSim || (sim === bestSim && doc.size < docs[bestIndex].size);
      if (better) {
        bestIndex = i;
        bestSim = sim;
      }
    });

    const best =
      bestIndex === -1
        ? null
        : { slug: existing[bestIndex].slug, similarity: bestSim };

    if (best && best.similarity >= COVERED_AT) {
      /* Rejected queries keep their measurements. The fact that a query is
         already covered does not make the number uninteresting — it is the
         evidence for whether the page covering it deserves a refresh, and
         throwing it away means re-measuring the whole market next time. */
      rejected.push({
        query: obs.query,
        by: best.slug,
        similarity: best.similarity,
        interest: obs.interest,
        trajectory: obs.trajectory,
        measurement: obs.measurement,
      });
      continue;
    }

    briefs.push({
      query: obs.query,
      slug: toSlug(obs.query),
      score: score(obs, best?.similarity ?? 0),
      interest: obs.interest,
      trajectory: obs.trajectory,
      related: obs.related ?? [],
      source: obs.source,
      observedAt: obs.observedAt,
      note: obs.note,
      measurement: obs.measurement,
      nearest: best,
    });
  }

  briefs.sort((a, b) => b.score - a.score);
  const selected = briefs.slice(0, TAKE);

  console.log(`  Already answered — ${rejected.length} queries dropped`);
  for (const r of [...rejected].sort((a, b) => b.interest - a.interest).slice(0, 8)) {
    console.log(
      `    ${String(r.interest).padStart(3)}  ${r.query.padEnd(42)} ${r.by} (${r.similarity.toFixed(2)})`,
    );
  }
  if (rejected.length > 8) console.log(`    …and ${rejected.length - 8} more`);

  console.log(`\n  Worth writing — top ${selected.length} of ${briefs.length}`);
  for (const b of selected) {
    console.log(
      `    ${String(Math.round(b.score)).padStart(3)}  ${b.query.padEnd(36)} ` +
        `${b.trajectory}, interest ${b.interest}`,
    );
    console.log(`         → /guides/${b.slug}`);
  }

  const out = resolve(`pipeline/data/briefs-${RUN}.json`);
  await writeFile(
    out,
    JSON.stringify(
      {
        runId: RUN,
        source: source.name,
        generatedAt: new Date().toISOString(),
        coveredAt: COVERED_AT,
        selected,
        alsoConsidered: briefs.slice(TAKE),
        rejected,
      },
      null,
      2,
    ) + "\n",
  );

  /* The market, as measured, whether or not it produced a brief. This is the
     file to diff between runs: it is what tells you a query you already cover
     has doubled, which is a refresh worth doing and is invisible from the
     briefs alone. */
  /* Tagged with the source, because runs from different sources are different
     measurements of the same market and must not overwrite each other. A
     dataset run silently clobbering a live browser run is how the only real
     numbers you have get replaced by estimates. */
  const measurements = resolve(
    `pipeline/data/measurements-${RUN}-${source.name}.json`,
  );
  await writeFile(
    measurements,
    JSON.stringify(
      {
        runId: RUN,
        source: source.name,
        observedAt: observations[0]?.observedAt ?? null,
        geo: process.env.TRENDS_GEO ?? "US",
        anchor: process.env.TRENDS_ANCHOR ?? "nclex",
        note:
          "Interest is relative to the strongest candidate in this run, " +
          "cross-calibrated through the anchor term. It is a ranking, not a " +
          "search volume. A zero means Google Trends would not report on the " +
          "query, which for a long-tail phrase means 'below the threshold' " +
          "rather than 'nobody searches this'.",
        keywords: observations
          .slice()
          .sort((a, b) => b.interest - a.interest)
          .map((o) => ({
            query: o.query,
            interest: o.interest,
            trajectory: o.trajectory,
            source: o.source,
            observedAt: o.observedAt,
            geo: o.geo,
            measurement: o.measurement,
            note: o.note,
          })),
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\n  Briefs        ${out}`);
  console.log(`  Measurements  ${measurements}\n`);
}

/* ------------------------------------------------------------- similarity */

/** Lowercase word tokens, minus the noise that carries no meaning. */
const STOP = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "in", "on", "is", "it",
  "my", "i", "do", "does", "how", "what", "when", "where", "why", "can",
  "should", "with", "you", "your", "about",
]);

/**
 * The abbreviations this field actually uses, expanded before matching.
 *
 * Token overlap cannot know that SATA and "select all that apply" are the same
 * thing, and the cost of it not knowing is concrete: the first run of this
 * stage proposed writing "how to answer select all that apply nclex" as a new
 * page, scoring it 0.64 against a threshold of 0.65, while
 * /guides/how-to-answer-sata sat in the library answering exactly that query.
 * That is the duplicate-cannibalisation failure this whole stage exists to
 * prevent, arriving through the front door.
 *
 * A short, explicit alias list is the right fix. It is auditable, it is wrong
 * in ways a person can see and correct, and it does not pretend the matcher
 * understands language. Add to it whenever a rejection looks wrong.
 */
const ALIASES: Record<string, string[]> = {
  sata: ["select", "all", "that", "apply"],
  ngn: ["next", "generation"],
  pvt: ["pearson", "vue", "trick"],
  ien: ["internationally", "educated"],
  cat: ["computerized", "adaptive"],
  bon: ["board", "nursing"],
  att: ["authorization", "test"],
  nlc: ["nurse", "licensure", "compact"],
};

function tokenSet(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    /* Crude stemming: plurals only. Enough to match "accommodation" to
       "accommodations" without dragging in a stemmer that would also turn
       "dosage" into "dosag". */
    .map((t) => (t.endsWith("s") && t.length > 4 ? t.slice(0, -1) : t));

  const out = new Set(tokens);
  /* Expand both ways: the abbreviation keeps its own token *and* gains the
     words it stands for, so "sata" matches the spelled-out phrase and the
     spelled-out phrase still matches a guide titled with the abbreviation. */
  for (const token of tokens) {
    for (const word of ALIASES[token] ?? []) {
      if (!STOP.has(word)) out.add(word);
    }
  }
  return out;
}

function buildIdf(docs: Set<string>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const token of doc) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log(docs.length / count) + 1);
  }
  return idf;
}

/**
 * How much of the query's meaning this guide already carries.
 *
 * Asymmetric on purpose — the denominator is the query's weight, not the
 * union. The question is "does this guide answer the query", and a long guide
 * that happens to cover a short query should score high, not be punished for
 * also covering other things.
 */
function similarity(
  query: Set<string>,
  doc: Set<string>,
  idf: Map<string, number>,
): number {
  let shared = 0;
  let total = 0;
  for (const token of query) {
    /* A token the library has never seen is maximally informative — it is
       exactly the kind of gap worth publishing into. */
    const weight = idf.get(token) ?? Math.log(1000) + 1;
    total += weight;
    if (doc.has(token)) shared += weight;
  }
  return total === 0 ? 0 : shared / total;
}

function score(obs: KeywordObservation, coverage: number): number {
  /* Interest is the base, direction adjusts it, and partial coverage discounts
     it — a query half-answered elsewhere is worth less than a clean gap even
     when the volume is identical. */
  return obs.interest * TRAJECTORY_WEIGHT[obs.trajectory] * (1 - coverage);
}

function toSlug(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

main().catch((err) => {
  console.error(`\nResearch failed: ${err.message}\n`);
  process.exit(1);
});
