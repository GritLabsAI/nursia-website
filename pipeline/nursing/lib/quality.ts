import { createHash } from "node:crypto";

/**
 * The gate between what was written and what gets published.
 *
 * A thousand-page programme fails in one of two ways, and both of them are
 * invisible at the moment of writing. Either the pages are thin — technically
 * present, substantively empty — or they are identical to each other under a
 * layer of different nouns. Google is good at detecting both, the penalty
 * lands on the whole domain rather than on the offending pages, and by the
 * time rankings move the library is too large to review by hand.
 *
 * So it is reviewed by machine, before publication, and a page that fails is
 * held back rather than published and fixed later. That ordering is the whole
 * point: a page that never reaches the sitemap costs nothing, and a page that
 * reaches it and is later removed has already been counted.
 *
 * Three checks, in increasing order of how much they catch.
 *
 *   substance   length, structure, and whether the short answer actually
 *               answers in the first sentence
 *   voice       the phrases that mark generated prose, which are worth
 *               rejecting for their own sake and are also a decent proxy for
 *               a page written without anything specific to say
 *   duplication a shingle fingerprint against everything already written,
 *               which is the check that scales — two pages can share no
 *               sentence and still be the same page
 */

export type Draft = {
  slug: string;
  metaDescription: string;
  shortAnswer: string;
  sections: { h2: string; body: string[] }[];
  faqs: { q: string; a: string }[];
};

export type QualityReport = {
  ok: boolean;
  words: number;
  sections: number;
  faqs: number;
  /** The slug this page duplicates, if any. */
  duplicateOf: string | null;
  similarity: number;
  issues: string[];
};

/** Below this a page is a stub, whatever else is true of it. */
const MIN_WORDS = 520;
const MIN_SECTIONS = 3;
const MIN_SHORT_ANSWER_WORDS = 28;
const MAX_SHORT_ANSWER_WORDS = 95;

/**
 * Above this, two pages are the same page.
 *
 * Measured on 5-word shingles, where unrelated pages in one subject area
 * typically land around 0.05–0.15 — they share the vocabulary of nursing and
 * little else. Two pages built from one template land far higher. 0.42 sits
 * well clear of the honest band without catching the genuine overlap between,
 * say, hyperkalaemia and hypokalaemia, which share a real amount of material
 * because the subjects do.
 */
const DUPLICATE_AT = 0.42;

/**
 * Phrases that mark prose written to fill a space rather than to say a thing.
 *
 * This list is not about taste. Every entry is a construction that appears
 * when a model has been asked to write about something it has nothing
 * particular to say about, which makes it a usable proxy for the page being
 * empty — and the reader who bounces after one paragraph is the actual cost.
 */
const BANNED = [
  "in conclusion",
  "in summary,",
  "it is important to note",
  "it's important to note",
  "it is worth noting",
  "delve into",
  "delving into",
  "tapestry",
  "navigate the complexities",
  "navigating the complexities",
  "in today's fast-paced",
  "in the world of",
  "when it comes to",
  "plays a crucial role",
  "plays a vital role",
  "a testament to",
  "the realm of",
  "embark on",
  "unlock the",
  "game-changer",
  "cornerstone of",
  "as an ai",
  "as a language model",
  "lorem ipsum",
  "placeholder",
  "todo",
  "[insert",
];

/** Nothing here may claim to be individual medical advice. */
const UNSAFE = [
  "consult your doctor before taking",
  "this is medical advice",
  "i recommend that you take",
];

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function draftText(d: Draft): string {
  return [
    d.shortAnswer,
    ...d.sections.flatMap((s) => [s.h2, ...s.body]),
    ...d.faqs.flatMap((f) => [f.q, f.a]),
  ].join("\n");
}

/**
 * A stable fingerprint over the prose.
 *
 * Over the body only — not the title, not the headings. Two pages given the
 * same outline have identical headings by construction, and including them
 * would make every page look slightly more similar to every other page of its
 * kind, which is exactly the signal this is trying to isolate from.
 */
export function contentHash(d: Draft): string {
  const body = [d.shortAnswer, ...d.sections.flatMap((s) => s.body), ...d.faqs.map((f) => f.a)]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(body).digest("hex").slice(0, 32);
}

/** Overlapping 5-word sequences, which is what makes near-duplicates visible. */
export function shingles(text: string, n = 5): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

/** Jaccard, which is symmetric — for duplicates that is the right question. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (large.has(s)) shared++;
  return shared / (a.size + b.size - shared);
}

export type Corpus = { slug: string; shingles: Set<string> }[];

export function check(d: Draft, corpus: Corpus): QualityReport {
  const issues: string[] = [];
  const text = draftText(d);
  const words = wordCount(text);
  const lower = text.toLowerCase();

  /* ------------------------------------------------------------ substance */

  if (words < MIN_WORDS) issues.push(`${words} words, needs ${MIN_WORDS}`);
  if (d.sections.length < MIN_SECTIONS) {
    issues.push(`${d.sections.length} sections, needs ${MIN_SECTIONS}`);
  }
  const emptySections = d.sections.filter(
    (s) => !s.h2?.trim() || !s.body?.length || wordCount(s.body.join(" ")) < 40,
  );
  if (emptySections.length) {
    issues.push(`${emptySections.length} section(s) under 40 words`);
  }

  const saWords = wordCount(d.shortAnswer);
  if (saWords < MIN_SHORT_ANSWER_WORDS) issues.push(`short answer only ${saWords} words`);
  if (saWords > MAX_SHORT_ANSWER_WORDS) {
    issues.push(`short answer ${saWords} words — too long to be quoted`);
  }

  if (!d.metaDescription?.trim()) issues.push("no meta description");
  else if (d.metaDescription.length > 165) {
    issues.push(`meta description ${d.metaDescription.length} chars`);
  }

  /* A short answer that opens by restating the question has not answered it,
     and it is the single most common way a generated answer fails to be
     liftable into a snippet. */
  if (/^(this (page|guide|article)|in this (guide|article))/i.test(d.shortAnswer.trim())) {
    issues.push("short answer opens by describing the page rather than answering");
  }

  /* --------------------------------------------------------------- voice */

  const banned = BANNED.filter((p) => lower.includes(p));
  if (banned.length) issues.push(`banned phrasing: ${banned.slice(0, 3).join(", ")}`);

  const unsafe = UNSAFE.filter((p) => lower.includes(p));
  if (unsafe.length) issues.push(`unsafe claim: ${unsafe[0]}`);

  /* --------------------------------------------------------- duplication */

  const sh = shingles(text);
  let duplicateOf: string | null = null;
  let best = 0;
  for (const c of corpus) {
    if (c.slug === d.slug) continue;
    const sim = jaccard(sh, c.shingles);
    if (sim > best) {
      best = sim;
      duplicateOf = c.slug;
    }
  }
  if (best >= DUPLICATE_AT) {
    issues.push(`${(best * 100).toFixed(0)}% overlap with ${duplicateOf}`);
  } else {
    duplicateOf = null;
  }

  return {
    ok: issues.length === 0,
    words,
    sections: d.sections.length,
    faqs: d.faqs.length,
    duplicateOf,
    similarity: best,
    issues,
  };
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}
