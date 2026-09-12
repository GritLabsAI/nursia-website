import type { PageKind } from "./store";

/**
 * The shape of a written page, and the standard it has to meet.
 *
 * Every page in this programme is written by hand. That is a deliberate and
 * expensive choice: the alternative — generating a hundred pages from a
 * template and a keyword — produces exactly the pages this industry is full of,
 * and Google has spent three years getting better at recognising them. A page
 * here has to be worth the click from somebody who is three days out from an
 * exam that costs $200 and a year of their life.
 *
 * The gates below are not style preferences. Each one exists because there is a
 * specific way a batch of a hundred pages goes wrong, and each one has failed a
 * draft of mine while writing this run.
 */

export type Draft = {
  /** Must match a planned page in the store. Nothing publishes unplanned. */
  slug: string;
  /**
   * Optional overrides of what the planner generated.
   *
   * The planner builds titles from five patterns, which is fine for making a
   * row publishable and not fine as a final answer. Writing the page nearly
   * always suggests a better heading than a template could, and the writer
   * should be able to use it without editing the planner.
   */
  title?: string;
  h1?: string;
  shortAnswer: string;
  keyPoints: string[];
  sections: { h2: string; body: string[] }[];
  examTip?: string;
  faqs: { q: string; a: string }[];
};

/**
 * Phrases that mean nobody was thinking.
 *
 * Two kinds. The first are the tells of generated filler — "delve", "tapestry",
 * "navigate the complexities". The second are worse because they read as
 * competent: "it is important to note that", "in conclusion", "as a nurse, you
 * will need to". They are sentences that take up space where a fact should be,
 * and a hundred pages of them is a hundred pages that say nothing.
 *
 * Matched case-insensitively against the whole page. A false positive here
 * costs one rewritten sentence, which is cheap.
 */
export const BANNED = [
  "in conclusion",
  "it is important to note",
  "it's important to note",
  "it is worth noting",
  "in today's",
  "delve into",
  "tapestry",
  "navigate the complexities",
  "plays a crucial role",
  "plays a vital role",
  "a wide range of",
  "when it comes to",
  "this article will",
  "in this article",
  "we will explore",
  "let's dive",
  "first and foremost",
  "last but not least",
  "at the end of the day",
  "rest assured",
  "game changer",
  "leverage",
  "robust",
  "seamless",
  "unlock the",
  "master the art",
];

/**
 * What each kind of page has to actually contain.
 *
 * The `angle` on a planned row says what the page is for; this is the machine
 * check that it kept the promise. A practice page that never mentions how a
 * stem is built is a topic summary wearing a practice title — it will not rank
 * for a practice query and it will not help anybody, and without this check it
 * looks identical to a good one from every automated angle.
 *
 * Deliberately crude. It cannot tell a good explanation of a distractor from a
 * bad one; it can tell that nobody tried.
 */
export const KIND_MUST_MENTION: Record<PageKind, { any: string[]; why: string }> = {
  practice: {
    any: ["stem", "distractor", "option", "answer choice"],
    why: "A practice page has to show how the question is built, not summarise the topic.",
  },
  review: {
    any: ["tested", "test plan", "exam asks", "appears", "expect"],
    why: "A review page has to say what is actually tested, not restate a chapter.",
  },
  clinical: {
    any: ["assess", "first", "priority", "escalate", "report"],
    why: "A clinical page has to say what the nurse does first and why.",
  },
  medication: {
    any: ["hold", "teach", "monitor", "toxicity", "contraindicat"],
    why: "A medication page has to say what to hold for, what to monitor and what to teach.",
  },
  strategy: {
    any: ["question", "option", "choose", "rule"],
    why: "A strategy page has to work a real question, not state a slogan.",
  },
};

/* -------------------------------------------------------------- measures */

export function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function draftWords(d: Draft): number {
  return (
    words(d.shortAnswer) +
    d.keyPoints.reduce((n, k) => n + words(k), 0) +
    words(d.examTip ?? "") +
    d.sections.reduce(
      (n, s) => n + words(s.h2) + s.body.reduce((m, p) => m + words(p), 0),
      0,
    ) +
    d.faqs.reduce((n, f) => n + words(f.q) + words(f.a), 0)
  );
}

/**
 * Reading time, rounded the way a reader experiences it.
 *
 * 220 words a minute, rounded up and floored at one: a page that says "0 min"
 * reads as broken, and one that understates is a small breach of trust at the
 * top of the page.
 */
export function minutes(n: number): number {
  return Math.max(1, Math.ceil(n / 220));
}

/* ----------------------------------------------------------------- gates */

export type Problem = { slug: string; gate: string; detail: string };

/** The floor a page has to clear to be worth publishing at all. */
export const MIN_WORDS = 450;
export const MIN_SECTIONS = 3;
export const MIN_PARAGRAPHS_PER_SECTION = 2;
export const MIN_FAQS = 2;

export function checkDraft(d: Draft, kind: PageKind): Problem[] {
  const problems: Problem[] = [];
  const fail = (gate: string, detail: string) =>
    problems.push({ slug: d.slug, gate, detail });

  const shortAnswerWords = words(d.shortAnswer);
  if (d.shortAnswer.length < 120 || d.shortAnswer.length > 520) {
    fail("short-answer-length", `${d.shortAnswer.length} characters; the schema allows 120-520.`);
  }
  if (shortAnswerWords < 35 || shortAnswerWords > 80) {
    fail(
      "short-answer-shape",
      `${shortAnswerWords} words. Under 35 reads as a stub; over 80 will not be quoted whole.`,
    );
  }

  if (d.keyPoints.length < 3 || d.keyPoints.length > 6) {
    fail("key-points-count", `${d.keyPoints.length}; three to six.`);
  }
  for (const point of d.keyPoints) {
    if (point.trim().length <= 30 || !/[.?]$/.test(point.trim())) {
      fail("key-point-shape", `Not a full sentence: "${point.slice(0, 60)}…"`);
    }
  }

  if (d.sections.length < MIN_SECTIONS) {
    fail("sections", `${d.sections.length}; at least ${MIN_SECTIONS}.`);
  }
  for (const s of d.sections) {
    if (!s.h2 || s.h2.length > 80) {
      fail("heading-length", `"${s.h2}" is ${s.h2?.length ?? 0} characters; the schema allows 80.`);
    }
    if (s.body.length < MIN_PARAGRAPHS_PER_SECTION) {
      fail("section-thin", `"${s.h2}" has ${s.body.length} paragraph(s).`);
    }
    for (const p of s.body) {
      if (words(p) < 25) {
        fail("paragraph-thin", `Under "${s.h2}": "${p.slice(0, 50)}…" is ${words(p)} words.`);
      }
    }
  }

  if (d.faqs.length < MIN_FAQS) {
    fail("faqs", `${d.faqs.length}; at least ${MIN_FAQS}.`);
  }
  for (const f of d.faqs) {
    if (f.a.length > 400) {
      fail("faq-length", `"${f.q}" answers in ${f.a.length} characters; over 400 stops being quotable.`);
    }
    if (f.q.length > 120) {
      fail("faq-question-length", `"${f.q.slice(0, 60)}…" is ${f.q.length} characters.`);
    }
  }

  const total = draftWords(d);
  if (total < MIN_WORDS) {
    fail("thin", `${total} words; the floor is ${MIN_WORDS}.`);
  }

  const prose = fullText(d).toLowerCase();
  for (const phrase of BANNED) {
    if (prose.includes(phrase)) {
      fail("filler", `Contains "${phrase}".`);
    }
  }

  const must = KIND_MUST_MENTION[kind];
  if (must && !must.any.some((needle) => prose.includes(needle))) {
    fail(
      "off-angle",
      `${must.why} None of ${must.any.map((s) => `"${s}"`).join(", ")} appear.`,
    );
  }

  return problems;
}

/**
 * The check that only makes sense across a batch: no two pages may share a
 * paragraph.
 *
 * This is the specific failure mode of writing a hundred pages on one subject
 * area. The boilerplate paragraph — "the NCLEX is a computerised adaptive test
 * of between 85 and 150 questions" — is true, it is relevant, and by the
 * fifteenth page it has become the reason the whole cluster reads as
 * templated. Near-duplicate pages also compete with each other, which is the
 * problem stage 21 spent its whole run preventing.
 *
 * Exact-match on normalised text, so a paragraph genuinely rewritten passes. A
 * sentence repeated inside one page is fine and not checked; a paragraph
 * repeated across two is not.
 */
export function checkDuplication(drafts: Draft[]): Problem[] {
  const seen = new Map<string, string>();
  const problems: Problem[] = [];

  for (const d of drafts) {
    const paragraphs = [
      d.shortAnswer,
      ...d.keyPoints,
      ...d.sections.flatMap((s) => s.body),
      ...d.faqs.map((f) => f.a),
    ];
    for (const p of paragraphs) {
      const norm = p.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
      /* Short lines repeat innocently — "Check the state board." is not
         boilerplate, it is a sentence. The threshold is where a repeat stops
         being a coincidence. */
      if (norm.length < 80) continue;
      const first = seen.get(norm);
      if (first && first !== d.slug) {
        problems.push({
          slug: d.slug,
          gate: "duplicate-paragraph",
          detail: `Shares a paragraph with ${first}: "${p.slice(0, 70)}…"`,
        });
      } else if (!first) {
        seen.set(norm, d.slug);
      }
    }
  }
  return problems;
}

export function fullText(d: Draft): string {
  return [
    d.title ?? "",
    d.h1 ?? "",
    d.shortAnswer,
    ...d.keyPoints,
    d.examTip ?? "",
    ...d.sections.flatMap((s) => [s.h2, ...s.body]),
    ...d.faqs.flatMap((f) => [f.q, f.a]),
  ].join("\n");
}
