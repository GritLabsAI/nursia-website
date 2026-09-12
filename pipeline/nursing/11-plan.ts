/**
 * Stage 11 — decide what the thousand pages are.
 *
 * Two sources, joined at the question-bank topic.
 *
 *   the clinical index   what the subject contains — 485 entities a nurse
 *                        must know, each with the fact that makes its page
 *                        specific rather than generic
 *   the keyword table    what people are actually typing, clustered so that
 *                        eight spellings of one query produce one page
 *
 * Neither alone is enough. The keywords cannot carry a thousand pages: after
 * clustering there are about four hundred real queries, and the rest of the
 * export is the same question spelled differently. The index cannot be ranked:
 * it knows heart failure matters but not that people search for it. Together
 * they produce a plan where every page is either something a nurse needs or
 * something a nurse asked for, and usually both.
 *
 * Three things this stage refuses to do, because each of them is how a large
 * content programme destroys the site it was meant to grow:
 *
 *   - **Publish into a query the library already answers.** The fifty curated
 *     guides rank. A programmatic page on the same query does not add traffic,
 *     it splits it. Every candidate is scored against the existing library and
 *     against the pages already planned in this run, and a near-match is
 *     rejected with the page that beat it named in the row.
 *   - **Invent demand to hit a number.** If the plan comes in under a thousand
 *     the honest output is under a thousand. Padding is how a library of real
 *     pages becomes a library with a thin tail that drags the rest down.
 *   - **Give two pages the same skeleton.** The outline is chosen from several
 *     per kind, keyed off the slug, so two condition pages do not open with
 *     the same four headings. It is the cheapest real defence against the
 *     template smell, and it costs nothing at write time.
 *
 *   npm run nursing:plan
 *   npm run nursing:plan -- --dry
 *   npm run nursing:plan -- --target 1000
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { runId, writeClient } from "../lib/sanity";
import {
  openNursingStore,
  readSharedKeywords,
  type PageFamily,
  type PlanRow,
} from "./lib/store";
import { CLINICAL_INDEX, type Entity, type EntityKind } from "./lib/taxonomy";
import {
  buildIdf,
  canonical,
  cluster,
  isRelevant,
  similarity,
  slugify,
  tokens,
} from "./lib/normalize";

const RUN = runId();
const DRY = process.argv.includes("--dry");
const TARGET = Number(argOf("--target") ?? "1000");

/**
 * Above this a candidate counts as already covered.
 *
 * The guides pipeline settled on 0.65 against a library of fifty. This runs
 * against a library that grows to a thousand as the plan is built, so the same
 * threshold rejects far more aggressively — which is correct: the more pages
 * exist, the higher the bar for another one.
 */
const COVERED_AT = 0.72;

/** Below this a keyword is not worth a page of its own. */
const MIN_VOLUME = 10;

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/* -------------------------------------------------------------- outlines */

/**
 * The brief the writer is handed.
 *
 * Several per kind, chosen by slug hash. A condition page and a drug page ask
 * different questions in different orders — that much is obvious — but two
 * condition pages sharing one skeleton is the subtler failure, and at four
 * hundred condition pages it is the one a reader notices first. Varying the
 * outline does not make the pages different; it stops them being identical in
 * the one dimension a person scanning a category page can see.
 */
const OUTLINES: Record<EntityKind, string[][]> = {
  condition: [
    ["What it is and why it happens", "How it presents — what you will actually see", "Nursing assessment priorities", "Interventions and what to do first", "Complications to watch for", "Patient teaching before discharge"],
    ["The pathophysiology in one pass", "Assessment findings that matter", "What the exam asks about this", "Nursing interventions in priority order", "Medications and monitoring", "When to escalate"],
    ["Recognising it at the bedside", "Why the classic presentation misleads", "Priority nursing actions", "Labs and diagnostics to expect", "Complications and their early signs", "Teaching that changes outcomes"],
    ["The clinical picture", "Assessment: what to look for and in what order", "Immediate interventions", "Ongoing nursing management", "Patient and family education", "How this appears on the NCLEX"],
  ],
  drug: [
    ["What it does and why it is prescribed", "Nursing considerations before giving it", "What to monitor", "Side effects versus adverse effects", "What to hold for and when to call", "Patient teaching"],
    ["Mechanism, simply", "Indications you will see on the ward", "Assessment before administration", "Toxicity and the antidote", "Interactions that matter", "What the patient must be told"],
    ["Why this drug and not another", "Administration and timing", "Monitoring parameters", "Adverse effects to report", "Contraindications and cautions", "Teaching points the exam tests"],
  ],
  procedure: [
    ["When it is done and why", "Preparing the patient", "The steps that matter for safety", "During the procedure — the nurse's role", "After: monitoring and complications", "Documentation and teaching"],
    ["What the procedure achieves", "Pre-procedure nursing responsibilities", "Equipment and positioning", "Complications and early signs", "Post-procedure care", "What to teach before discharge"],
    ["Indications and contraindications", "Getting the patient ready", "Technique and safety checks", "What can go wrong", "Ongoing care", "Common exam questions"],
  ],
  lab: [
    ["What the test measures", "Normal ranges and what moves them", "What a high result means", "What a low result means", "Nursing actions by result", "Patient preparation and teaching"],
    ["Why this value is ordered", "Interpreting the number in context", "Critical values and what to do", "Related tests read alongside it", "Nursing implications", "What patients ask about it"],
  ],
  concept: [
    ["The idea in one paragraph", "Why it matters clinically", "How to apply it at the bedside", "Where students get it wrong", "Worked examples", "How the exam tests it"],
    ["What the concept actually says", "The clinical reasoning behind it", "Applying it under time pressure", "Common misconceptions", "Practice scenarios", "Key takeaways"],
    ["Defining it precisely", "The exceptions that matter", "Using it to prioritise", "Traps in exam wording", "Examples from practice", "Summary"],
  ],
  skill: [
    ["What the skill is for", "The method, step by step", "Where it goes wrong", "Practising it deliberately", "Applying it on the exam", "A worked example"],
    ["Why this skill decides answers", "How to do it reliably", "The common errors", "Drills that build it", "Exam application", "Quick reference"],
  ],
};

/** Outlines for pages that come from a query rather than from an entity. */
const QUERY_OUTLINES: Record<Exclude<PageFamily, "clinical">, string[][]> = {
  faq: [
    ["The short answer", "The detail behind it", "What this means for your study plan", "Related questions people ask"],
    ["Answering it directly", "Why the answer is what it is", "Exceptions and edge cases", "What to do next"],
  ],
  exam: [
    ["The rule as it stands", "How the process actually works", "What trips people up", "What to do if it goes wrong", "Where to check the current version"],
    ["What you need to know", "Step by step", "Costs, timing and paperwork", "Common problems and fixes", "Official sources"],
  ],
  practice: [
    ["What this kind of practice is for", "How to use it without wasting time", "What a good session looks like", "Reading your results honestly", "Where to practise this"],
    ["Why practice questions beat re-reading", "Structuring a session", "Reviewing the ones you got wrong", "Tracking whether it is working", "Try a set"],
  ],
  career: [
    ["The short version", "How it works in practice", "Requirements and timelines", "What it costs and what it pays", "Next steps"],
    ["What the role or requirement involves", "Getting there from here", "The paperwork", "What to expect", "Where to go next"],
  ],
};

/* ---------------------------------------------------------------- slugs */

const KIND_SUFFIX: Record<EntityKind, string> = {
  condition: "nursing-care",
  drug: "nursing-considerations",
  procedure: "nursing-management",
  lab: "nursing-interpretation",
  concept: "nursing-guide",
  skill: "nursing-skill",
};

const KIND_TITLE: Record<EntityKind, (n: string) => string> = {
  condition: (n) => `${n}: Nursing Care, Assessment and Interventions`,
  drug: (n) => `${n}: Nursing Considerations and Patient Teaching`,
  procedure: (n) => `${n}: Nursing Management Step by Step`,
  lab: (n) => `${n}: How Nurses Interpret the Result`,
  concept: (n) => `${n}: What It Means and How to Apply It`,
  skill: (n) => `${n}: How to Do It and How It Is Tested`,
};

const KIND_H1: Record<EntityKind, (n: string) => string> = {
  condition: (n) => `${n} nursing care: what to assess and what to do first`,
  drug: (n) => `${n}: what to check before you give it`,
  procedure: (n) => `${n}: the nurse's role, start to finish`,
  lab: (n) => `${n}: reading the number and acting on it`,
  concept: (n) => `${n}, explained for the bedside and the exam`,
  skill: (n) => `${n}: the method, the errors, and the exam`,
};

/* ------------------------------------------------------------------ main */

async function main() {
  const store = openNursingStore();

  /*
   * Two sources for the market, merged.
   *
   * This pipeline's own table holds the Keyword Planner exports it ingested.
   * The shared table belongs to the guides pipeline's harvester, which may be
   * running right now — it drives Keyword Planner through a browser for hours
   * — so it is read read-only and treated as an enrichment that may be absent.
   * Where both have a keyword, the larger volume wins: they are the same
   * market measured twice, and the harvester's numbers are usually fresher.
   */
  const own = store.keywords(0);
  const shared = readSharedKeywords();
  const byKeyword = new Map(own.map((k) => [k.keyword, k]));
  for (const k of shared) {
    const prior = byKeyword.get(k.keyword);
    if (!prior || k.volume > prior.volume) byKeyword.set(k.keyword, k);
  }
  const raw = [...byKeyword.values()];

  if (!raw.length) {
    throw new Error(
      "No keywords at all. Planning would fall back to the clinical index " +
        "alone and quietly produce a third of a run — so it stops here " +
        "instead. Run `npm run nursing:ingest` first.",
    );
  }

  const relevant = raw.filter((k) => isRelevant(k.keyword));
  const clusters = cluster(relevant).filter((c) => c.volume >= MIN_VOLUME);

  console.log(`\nPlan (${RUN})${DRY ? " — DRY RUN" : ""}`);
  console.log(`  keywords    ${raw.length} raw (${own.length} ingested + ${shared.length} shared), ${relevant.length} relevant`);
  console.log(`  clusters    ${clusters.length} at volume >= ${MIN_VOLUME}`);

  /* Coverage is judged against what is published, not against what is in the
     repo — a guide an editor wrote by hand in the Studio counts as coverage or
     the planner will commission it again. */
  const client = writeClient();
  const existing = await client.fetch<{ slug: string; title: string; q: string | null }[]>(
    `*[_type in ["guide","nursingPage"]]{
       "slug": slug.current, title, "q": research.primaryQuery
     }`,
  );
  console.log(`  published   ${existing.length} pages already live\n`);

  /*
   * Coverage includes what a sibling pipeline has claimed but not yet written.
   *
   * `pipeline/nclex/` is a second programmatic library in this repository,
   * publishing broad subject reviews to /nclex-review/. Its pages are planned
   * and not yet live, so a Sanity query cannot see them — and a candidate that
   * is invisible to the dedupe is exactly the candidate that gets written
   * twice. Two libraries on one domain competing for "pharmacology for the
   * NCLEX" is the cannibalisation both of them exist to avoid, arriving from
   * the one direction neither was watching.
   *
   * Read from the plan file rather than from its database, because the file is
   * the committed artefact and reading another pipeline's SQLite while it may
   * be writing is the mistake this pipeline already made once.
   */
  const sibling = await readSiblingPlans();
  if (sibling.length) {
    console.log(`  sibling     ${sibling.length} pages claimed by pipeline/nclex`);
  }

  /* The corpus the dedupe runs against. It starts as the published library plus
     the sibling's claims, and grows as this run plans pages — which is what
     stops two candidates in the same run being planned onto the same query. */
  const corpus: { slug: string; tokenSet: Set<string> }[] = [
    ...existing.map((g) => ({
      slug: g.slug,
      tokenSet: new Set(tokens(`${g.title} ${g.slug} ${g.q ?? ""}`)),
    })),
    ...sibling.map((s) => ({
      slug: `nclex-review/${s.slug}`,
      tokenSet: new Set(tokens(`${s.title} ${s.slug} ${s.primaryQuery}`)),
    })),
  ];

  /* IDF is computed once over the published library. Recomputing it as the
     corpus grows would be more correct and would also mean the threshold means
     something different on page 900 than on page 9, which makes the rejections
     impossible to audit. A fixed weighting over a fixed reference set is the
     lesser inaccuracy. */
  const idf = buildIdf(
    corpus.length >= 8
      ? corpus.map((c) => c.tokenSet)
      : /* A near-empty library gives every token maximum weight, which lets
           everything through. Seed with the entity names so the weighting is
           meaningful on a first run against an empty dataset. */
        Object.values(CLINICAL_INDEX)
          .flat()
          .map((e) => new Set(tokens(e.name))),
  );

  const publishedCount = corpus.length;
  const planned = new Set<string>();
  const plans: PlanRow[] = [];
  const rejected: { slug: string; by: string; sim: number; from: string }[] = [];
  const now = new Date().toISOString();

  /**
   * Plan a page unless something already covers it.
   *
   * `guard` is which corpus the candidate is checked against, and the
   * distinction is the difference between a plan of 300 and a plan of 1,000.
   *
   * A query page is checked against everything, including pages planned
   * earlier in this same run, because the keyword corpus is full of near
   * duplicates and that is exactly what the check is for.
   *
   * An entity page is checked only against what was already published. The
   * clinical index is a hand-curated list in which every row is a distinct
   * thing a nurse must know, and distinctness was established when it was
   * written. Checking it against itself asks a token-overlap matcher to
   * re-adjudicate that, and it gets it wrong in a specific and damaging way:
   * type 1 and type 2 diabetes share every token but one, hyperthyroidism and
   * hypothyroidism share all but three characters, and the matcher throws away
   * the second of each pair. It threw away 203 of 485 — including myxedema
   * coma as a duplicate of thyroid storm, which are opposite emergencies with
   * opposite treatments. Deduping a curated set against itself does not remove
   * duplicates; it removes contrast.
   */
  const consider = (
    row: Omit<PlanRow, "status" | "dedupeOf" | "runId" | "createdAt">,
    from: string,
    guard: "published" | "everything" = "everything",
  ) => {
    /*
     * Matched on the query and the entity, never on the title.
     *
     * The title is this pipeline's own invention and it carries family
     * boilerplate — every practice page ends "A Practical Guide for Nursing
     * Students", every exam page "What to Expect and What to Do". Feeding that
     * to a token matcher makes every page of a family look like every other
     * page of that family, and it rejected 381 of 409 query candidates on the
     * strength of words this pipeline had just added itself. What has to be
     * unique is the thing the reader typed.
     */
    const tset = new Set(tokens(`${row.primaryQuery} ${row.entity ?? ""}`));
    const against = guard === "published" ? corpus.slice(0, publishedCount) : corpus;

    let best = { slug: "", sim: 0 };
    for (const c of against) {
      const sim = similarity(tset, c.tokenSet, idf);
      if (sim > best.sim) best = { slug: c.slug, sim };
    }
    if (best.sim >= COVERED_AT) {
      rejected.push({ slug: row.slug, by: best.slug, sim: best.sim, from });
      return;
    }
    /* A slug collision is a hard duplicate whatever the similarity says, and
       it is the one case the matcher cannot be allowed to wave through: two
       rows with one slug means the second silently overwrites the first in the
       store and one of the pages is never written at all. */
    if (planned.has(row.slug)) {
      rejected.push({ slug: row.slug, by: row.slug, sim: 1, from: `${from}:slug-collision` });
      return;
    }

    planned.add(row.slug);
    plans.push({ ...row, status: "planned", dedupeOf: null, runId: RUN, createdAt: now });

    /* Only pages that were checked against the whole corpus join it. An entity
       page is exempt from the similarity check by design, and adding it to the
       corpus anyway would re-impose that check on every query candidate that
       came after — through the back door, and only on the candidates unlucky
       enough to be planned late. Entity coverage is enforced by name instead. */
    if (guard === "everything") corpus.push({ slug: row.slug, tokenSet: tset });
  };

  /* ------------------------------------------------- 1. the clinical index */

  const byTopicQueries = new Map<string, string[]>();
  for (const c of clusters) {
    for (const m of c.members) {
      const t = topicFor(m);
      if (!byTopicQueries.has(t)) byTopicQueries.set(t, []);
      byTopicQueries.get(t)!.push(m);
    }
  }

  /* Volume for an entity comes from any keyword that mentions it. Most will
     have none, which is the point — "myxedema coma" is not a high-volume query
     and it is still a page a nursing library must have. The volume it does
     find is used to order the writing, not to decide it. */
  const volumeFor = (name: string, aka: string[] = []) => {
    const names = [name, ...aka].map((n) => n.toLowerCase());
    let v = 0;
    for (const r of relevant) {
      if (names.some((n) => r.keyword.includes(n))) v = Math.max(v, r.volume);
    }
    return v;
  };

  for (const [topic, entities] of Object.entries(CLINICAL_INDEX)) {
    for (const e of entities) {
      const slug = entitySlug(e);
      const vol = volumeFor(e.name, e.aka);
      consider(
        {
          slug,
          title: truncate(KIND_TITLE[e.kind](e.name), 70),
          h1: truncate(KIND_H1[e.kind](e.name), 90),
          family: "clinical",
          nursingTopic: topic,
          entity: e.name,
          primaryQuery: `${e.name.toLowerCase()} nursing`,
          secondary: JSON.stringify(
            [
              `${e.name.toLowerCase()} nclex questions`,
              `${e.name.toLowerCase()} nursing interventions`,
              ...(e.aka ?? []).map((a) => `${a} nursing`),
            ].slice(0, 6),
          ),
          volume: vol,
          competition: null,
          intent: "informational",
          angle: e.hook,
          outline: JSON.stringify(pick(OUTLINES[e.kind], slug)),
          facts: JSON.stringify([e.hook]),
          score: 30 + Math.log10(vol + 10) * 4,
        },
        "index",
        "published",
      );
    }
  }

  const fromIndex = plans.length;
  console.log(`  from index  ${fromIndex} entity pages planned`);

  /* ------------------------------------------------------ 2. the keywords */

  /*
   * A query that names something the clinical index already covers belongs to
   * that page, not to a second one.
   *
   * Checked by name rather than by similarity because similarity gets this
   * particular case badly wrong in both directions. The coverage score is
   * asymmetric — it asks how much of the query the page carries — so a
   * two-token query is "fully covered" by any longer page containing both
   * tokens, and it attributed "nursing exam" to the thyroid function tests
   * page at 1.00. Containment of an actual entity name is the thing that was
   * meant, so it is what gets tested.
   */
  const entityNames = Object.values(CLINICAL_INDEX)
    .flat()
    .flatMap((e) => [e.name, ...(e.aka ?? [])])
    .map((n) => n.toLowerCase())
    .filter((n) => n.length >= 5)
    .sort((a, b) => b.length - a.length);

  const namesAnEntity = (q: string) => {
    const lower = ` ${q.toLowerCase()} `;
    return entityNames.find((n) => lower.includes(` ${n} `) || lower.includes(`${n} `));
  };

  for (const c of clusters) {
    const family = familyFor(c.head);
    if (family === "clinical") continue; /* the index owns those */

    const owned = namesAnEntity(c.head);
    if (owned) {
      rejected.push({ slug: slugify(c.head), by: owned, sim: 1, from: "keyword:entity-owned" });
      continue;
    }

    const topic = topicFor(c.head);
    const slug = querySlug(c.head, family);
    consider(
      {
        slug,
        title: truncate(titleFor(c.head, family), 70),
        h1: truncate(h1For(c.head), 90),
        family,
        nursingTopic: topic,
        entity: null,
        primaryQuery: c.head,
        secondary: JSON.stringify(c.members.slice(1, 8)),
        volume: c.volume,
        competition: c.competition,
        intent: family === "faq" ? "informational" : "commercial-investigation",
        angle: angleFor(c.head, family),
        outline: JSON.stringify(pick(QUERY_OUTLINES[family], slug)),
        facts: JSON.stringify([]),
        score: Math.log10(c.volume + 10) * 10,
      },
      "keyword",
    );
  }

  console.log(`  from kwds   ${plans.length - fromIndex} query pages planned`);
  console.log(`  rejected    ${rejected.length} as already covered`);

  /* ------------------------------------------------------- 3. topic hubs */

  for (const topic of Object.keys(CLINICAL_INDEX)) {
    const label = topicLabel(topic);
    consider(
      {
        slug: `${topic}-nursing-study-guide`,
        title: truncate(`${label} for the NCLEX: A Study Guide`, 70),
        h1: truncate(`${label}: what to study and in what order`, 90),
        family: "practice",
        nursingTopic: topic,
        entity: null,
        primaryQuery: `${label.toLowerCase()} nclex study guide`,
        secondary: JSON.stringify(
          (byTopicQueries.get(topic) ?? []).slice(0, 6),
        ),
        volume: 0,
        competition: null,
        intent: "informational",
        angle: `The map of ${label.toLowerCase()} for someone deciding what to revise next, built around the ${CLINICAL_INDEX[topic].length} things this library covers in depth.`,
        outline: JSON.stringify([
          `What ${label.toLowerCase()} covers on the exam`,
          "The highest-yield areas, ranked",
          "What to study first if you are short on time",
          "The mistakes that cost marks here",
          "Where to practise",
        ]),
        facts: JSON.stringify(
          CLINICAL_INDEX[topic].slice(0, 12).map((e) => `${e.name}: ${e.hook}`),
        ),
        score: 28,
      },
      "hub",
    );
  }

  console.log(`  hubs        ${Object.keys(CLINICAL_INDEX).length} topic study guides\n`);

  /* --------------------------------------------------------------- output */

  plans.sort((a, b) => b.score - a.score);
  const selected = plans.slice(0, TARGET);

  const byFamily = new Map<string, number>();
  for (const p of selected) byFamily.set(p.family, (byFamily.get(p.family) ?? 0) + 1);

  console.log(`  Planned ${selected.length} pages${plans.length > TARGET ? ` (of ${plans.length} candidates)` : ""}`);
  for (const [f, n] of [...byFamily].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${f}`);
  }

  if (plans.length < TARGET) {
    console.log(
      `\n  ! ${TARGET - plans.length} short of the target. That is the honest number:\n` +
        `    every candidate the keyword data and the clinical index support is\n` +
        `    already here. Add entities to pipeline/nursing/lib/taxonomy.ts to\n` +
        `    raise it — do not lower MIN_VOLUME to pad the count.`,
    );
  }

  console.log(`\n  Top of the queue`);
  for (const p of selected.slice(0, 10)) {
    console.log(
      `    ${String(Math.round(p.score)).padStart(3)}  ${p.family.padEnd(9)} ${p.slug}`,
    );
  }

  if (DRY) {
    console.log("\n  dry run — nothing written\n");
    store.close();
    return;
  }

  store.putPlans(selected);
  const retired = store.retirePlanned(new Set(selected.map((p) => p.slug)));
  if (retired) {
    console.log(`\n  retired     ${retired} row(s) an earlier plan chose and this one does not`);
  }
  const out = resolve(`pipeline/nursing/data/plan-${RUN}.json`);
  await writeFile(
    out,
    JSON.stringify(
      {
        runId: RUN,
        generatedAt: now,
        coveredAt: COVERED_AT,
        minVolume: MIN_VOLUME,
        target: TARGET,
        planned: selected.length,
        byFamily: Object.fromEntries(byFamily),
        rejected,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\n  plan        ${out}`);
  console.log(`  store       ${JSON.stringify(store.counts())}\n`);
  store.close();
}

/* ------------------------------------------------------------- helpers */

type SiblingPlan = { slug: string; title: string; primaryQuery: string };

/**
 * What the sibling pipeline has already claimed.
 *
 * Best-effort on purpose. If `pipeline/nclex/` is absent, or its plan file has
 * moved, or its shape changes, this returns nothing and says so rather than
 * failing the run — a missing sibling is the normal case in a fresh checkout,
 * and a planner that will not run without one is a planner nobody can use.
 * What it must not do is silently return nothing when the file is there, so
 * every field it reads is optional and the count is printed by the caller.
 */
async function readSiblingPlans(): Promise<SiblingPlan[]> {
  const dir = resolve("pipeline/nclex/data");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => /^plan-.*\.json$/.test(f));
  } catch {
    return [];
  }

  const out = new Map<string, SiblingPlan>();
  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(join(dir, file), "utf8")) as {
        selected?: unknown;
      };
      const rows = Array.isArray(parsed.selected) ? parsed.selected : [];
      for (const r of rows as Record<string, unknown>[]) {
        const slug = typeof r.slug === "string" ? r.slug : null;
        if (!slug) continue;
        out.set(slug, {
          slug,
          title: typeof r.title === "string" ? r.title : slug,
          primaryQuery: typeof r.primaryQuery === "string" ? r.primaryQuery : "",
        });
      }
    } catch {
      /* A malformed sibling plan is the sibling's problem, not this run's. */
    }
  }
  return [...out.values()];
}

/** Deterministic choice from a list, so a slug always gets the same outline. */
function pick<T>(list: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function entitySlug(e: Entity): string {
  return slugify(`${e.name} ${KIND_SUFFIX[e.kind]}`);
}

/**
 * A slug for a query page.
 *
 * The query itself, cleaned up. Keeping the searcher's own words is what makes
 * the URL match the intent, and inventing a tidier phrasing is how a page ends
 * up ranking for nothing.
 */
function querySlug(head: string, family: PageFamily): string {
  const base = slugify(head);
  /* Two families collide constantly with the clinical index and with the
     existing guides — "nclex practice questions" is a page that already
     exists. Qualify them rather than let the dedupe throw them away. */
  if (family === "faq" && !/^(how|what|why|when|where|can|is|are|do|does)/.test(head)) {
    return slugify(`${head} explained`);
  }
  return base;
}

const QUESTION_START = /^(how|what|why|when|where|can|should|is|are|do|does|will)\b/i;

function familyFor(head: string): PageFamily {
  const h = head.toLowerCase();
  if (QUESTION_START.test(h) || /\b(how many|how long|how much|difference)\b/.test(h)) {
    return "faq";
  }
  if (/\b(cost|price|fee|register|registration|schedule|att|authorization|pass rate|passing|result|retake|fail|format|how many questions|requirement|eligib|apply|application)\b/.test(h)) {
    return "exam";
  }
  if (/\b(salary|job|career|school|program|degree|licen|endorsement|compact|state|board of nursing|bsn|adn|msn)\b/.test(h)) {
    return "career";
  }
  if (/\b(practice|question|quiz|test|bank|prep|study|exam|sample|review|app|course|material|book|tutor|plan|guide|tip|strategy|resource|free)\b/.test(h)) {
    return "practice";
  }
  return "faq";
}

/** Match a query to the question-bank topic whose subject it touches. */
const TOPIC_HINTS: Record<string, RegExp> = {
  pharmacology: /\b(pharm|drug|medication|med|dosage|insulin|antibiotic)\b/,
  "dosage-and-labs": /\b(dosage|calculation|math|lab|value|conversion|drip|iv rate)\b/,
  "maternity-newborn": /\b(matern|obstetric|ob|pregnan|newborn|neonat|postpartum|labor|labour)\b/,
  pediatrics: /\b(pediatric|paediatric|child|infant|peds)\b/,
  "mental-health": /\b(mental|psych|psychiatric|depression|anxiety|bipolar)\b/,
  "med-surg": /\b(med surg|medical surgical|med-surg|surgical|surgery)\b/,
  "prioritization-delegation": /\b(priorit|delegat|assignment|triage|who to see)\b/,
  sata: /\b(sata|select all|bowtie|bow tie|ngn|next gen|matrix|trend|drag and drop|question type|item type)\b/,
  "safe-care": /\b(safe|safety|infection|precaution|restraint|error)\b/,
  fundamentals: /\b(fundamental|nursing process|basic|adpie|maslow)\b/,
  cardiovascular: /\b(cardiac|cardio|heart|ecg|ekg)\b/,
  respiratory: /\b(respirator|lung|breathing|oxygen|abg)\b/,
  "health-promotion": /\b(health promotion|prevention|screening|immuni|vaccin)\b/,
  psychosocial: /\b(psychosocial|therapeutic communication|cultur|grief|coping)\b/,
  "risk-reduction": /\b(risk|complication|reduction|diagnostic)\b/,
  "basic-care": /\b(comfort|hygiene|nutrition|mobility|elimination)\b/,
  neurological: /\b(neuro|stroke|seizure|brain)\b/,
  endocrine: /\b(endocrine|diabet|thyroid|glucose)\b/,
  gastrointestinal: /\b(gi|gastro|bowel|liver|abdom)\b/,
  "renal-genitourinary": /\b(renal|kidney|urinary|dialysis|fluid|electrolyte)\b/,
};

function topicFor(query: string): string {
  const q = query.toLowerCase();
  for (const [topic, re] of Object.entries(TOPIC_HINTS)) {
    if (re.test(q)) return topic;
  }
  /* No subject signal at all means a page about the exam rather than about a
     body system, and those belong to fundamentals — which is where the
     clinical-judgement and nursing-process questions live. */
  return "fundamentals";
}

function topicLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .replace("Genitourinary", "Genitourinary")
    .replace("Sata", "Select All That Apply");
}

function titleCase(s: string): string {
  const small = new Set(["a", "an", "the", "for", "and", "or", "of", "to", "in", "on", "is", "it"]);
  return s
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && small.has(w.toLowerCase())
        ? w.toLowerCase()
        : /^(nclex|rn|lpn|lvn|pn|ngn|sata|iv|ecg|ekg|abg|cpr)$/i.test(w)
          ? w.toUpperCase()
          : w[0]?.toUpperCase() + w.slice(1),
    )
    .join(" ");
}

function titleFor(head: string, family: PageFamily): string {
  const t = titleCase(head);
  if (family === "faq" && QUESTION_START.test(head)) return `${t}?`;
  if (family === "exam") return `${t}: What to Expect and What to Do`;
  if (family === "career") return `${t}: Requirements, Timeline and Next Steps`;
  return `${t}: A Practical Guide for Nursing Students`;
}

function h1For(head: string): string {
  return titleCase(head);
}

function angleFor(head: string, family: PageFamily): string {
  const map: Record<PageFamily, string> = {
    faq: `Answer "${head}" in the first two sentences, then earn the rest of the page by saying what the answer depends on.`,
    exam: `Somebody reading this is trying to complete a step, not learn a topic. Give the current process, name what commonly goes wrong, and say where to check the authoritative version.`,
    practice: `Anyone can say "do practice questions". Say how to run a session, how to review the ones you got wrong, and how to tell whether it is working.`,
    career: `Concrete requirements and realistic timelines, with the variation between states named rather than smoothed over.`,
    clinical: `Build the page around the clinical specifics rather than around a definition.`,
  };
  return map[family];
}

/**
 * Cut a title to length without leaving it mid-thought.
 *
 * Cutting at the last space is not enough: "Sexually Transmitted Infections:
 * Nursing Care, Assessment and" is 70 characters, ends on a conjunction, and
 * is what a search result would show. Dangling function words and any trailing
 * punctuation come off too, so the worst case is a shorter title rather than a
 * broken one.
 */
const DANGLING = new Set([
  "and", "or", "the", "a", "an", "with", "for", "to", "of", "in", "on", "at",
  "by", "from", "as", "is", "are", "what", "how", "when", "your", "you",
]);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const words = s.slice(0, max).split(" ");
  words.pop(); /* the word the cut landed inside */
  while (words.length && DANGLING.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(" ").replace(/[\s:,;–—-]+$/, "");
}

main().catch((err) => {
  console.error(`\nPlan failed: ${err.message}\n`);
  process.exit(1);
});
