/**
 * The 50-question exam.
 *
 * This is the thing a free account is actually for: fifty items drawn across
 * every client-need category, answered under exam conditions, and scored into
 * a report. It is not the drill on /practice — there is no feedback until the
 * last question is in, because that is what the real thing is like.
 *
 * The draw is seeded rather than random so an exam survives a refresh: the
 * seed is the only thing worth persisting, and the same seed always rebuilds
 * the same fifty questions in the same order.
 */

import { BANK_LOADERS } from "@/lib/bank/loaders";
import type { BankQuestion } from "@/lib/bank/types";

export const EXAM_LENGTH = 50;

/**
 * The NCLEX-RN gives five hours for up to 150 items — two minutes an item.
 * Fifty items at that pace is 100 minutes, so that is what the clock reads.
 */
export const EXAM_MINUTES = 100;

/** The pass line NCSBN reports for the RN exam sits near this. */
export const PASS_MARK = 60;

export type ExamCategory = {
  key: string;
  /** the NCSBN client-need label, verbatim */
  name: string;
  /** its share of the real test plan */
  share: string;
  /** how many of the fifty come from it */
  count: number;
  /** bank topics that feed it */
  topics: string[];
};

/**
 * Weighted to the NCSBN test plan, using the midpoint of each published band
 * and rounded to fifty. Safe and effective care is the biggest slice on the
 * real exam and it is the biggest slice here.
 */
export const BLUEPRINT: ExamCategory[] = [
  {
    key: "safe-care",
    name: "Safe and effective care environment",
    share: "17–23%",
    count: 11,
    topics: ["safe-care", "prioritization-delegation"],
  },
  {
    key: "pharmacology",
    name: "Pharmacological and parenteral therapies",
    share: "13–19%",
    count: 9,
    topics: ["pharmacology", "dosage-and-labs"],
  },
  {
    key: "physiological",
    name: "Physiological adaptation",
    share: "11–17%",
    count: 8,
    topics: [
      "med-surg",
      "cardiovascular",
      "respiratory",
      "endocrine",
      "neurological",
      "gastrointestinal",
      "renal-genitourinary",
    ],
  },
  {
    key: "risk-reduction",
    name: "Reduction of risk potential",
    share: "9–15%",
    count: 7,
    topics: ["risk-reduction"],
  },
  {
    key: "psychosocial",
    name: "Psychosocial integrity",
    share: "6–12%",
    count: 5,
    topics: ["psychosocial", "mental-health"],
  },
  {
    key: "basic-care",
    name: "Basic care and comfort",
    share: "6–12%",
    count: 5,
    topics: ["basic-care", "fundamentals"],
  },
  {
    key: "health-promotion",
    name: "Health promotion and maintenance",
    share: "6–12%",
    count: 5,
    topics: ["health-promotion", "maternity-newborn", "pediatrics"],
  },
];

export type ExamItem = {
  question: BankQuestion;
  /** blueprint key, so the report can break the score down by category */
  category: string;
};

/* mulberry32 — small, fast, and good enough that two exams from two seeds do
   not look alike. The point is reproducibility, not cryptography. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates against a seeded source, so the order is a function of the seed. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/**
 * Build one exam. Draws each category's share from that category's topics,
 * spreading the draw across the topics rather than emptying the first one,
 * then shuffles the fifty together so the categories arrive mixed — which is
 * how the exam itself feels, and why it is harder than a topic set.
 */
export async function drawExam(seed: number): Promise<ExamItem[]> {
  const slugs = [...new Set(BLUEPRINT.flatMap((c) => c.topics))];
  const banks = new Map<string, BankQuestion[]>(
    await Promise.all(
      slugs.map(
        async (slug) => [slug, await BANK_LOADERS[slug]()] as [string, BankQuestion[]],
      ),
    ),
  );

  const rand = prng(seed);
  const picked: ExamItem[] = [];

  for (const category of BLUEPRINT) {
    /* Round-robin the topics so a two-topic category gives roughly half from
       each, rather than nine from one and none from the other. */
    const pools = category.topics.map((slug) => shuffle(banks.get(slug) ?? [], rand));
    for (let n = 0; n < category.count; n++) {
      const pool = pools[n % pools.length];
      const question = pool.pop() ?? pools.flat().pop();
      if (question) picked.push({ question, category: category.key });
    }
  }

  return shuffle(picked, rand);
}

export type CategoryScore = {
  category: ExamCategory;
  correct: number;
  total: number;
  pct: number;
};

export type ExamScore = {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  byCategory: CategoryScore[];
  /** blueprint keys, weakest first — the list the study plan is built from */
  weakest: string[];
};

export function scoreExam(items: ExamItem[], answers: (number | null)[]): ExamScore {
  const right = (i: number) => answers[i] !== null && answers[i] === items[i].question.answer;

  const byCategory = BLUEPRINT.map((category) => {
    const idx = items.map((it, i) => (it.category === category.key ? i : -1)).filter((i) => i >= 0);
    const correct = idx.filter(right).length;
    const total = idx.length;
    return { category, correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
  }).filter((c) => c.total > 0);

  const correct = items.filter((_, i) => right(i)).length;
  const pct = items.length ? Math.round((correct / items.length) * 100) : 0;

  return {
    correct,
    total: items.length,
    pct,
    passed: pct >= PASS_MARK,
    byCategory,
    weakest: byCategory
      .slice()
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)
      .map((c) => c.category.key),
  };
}

/** mm:ss, for the clock and for the time-taken line on the report. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
