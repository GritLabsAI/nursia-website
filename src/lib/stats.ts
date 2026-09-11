/**
 * What a candidate has actually done, accumulated on their account.
 *
 * The exam document holds one sitting and `attempts.ts` holds the individual
 * answers. This holds the running total across every sitting and every drill,
 * which is the thing that answers "am I getting better, and at what" in one
 * read — and the thing a study plan is built from.
 *
 * Counters only, updated with Firestore's atomic increment. That matters for
 * two reasons: two tabs answering questions cannot clobber each other's
 * totals, and a write costs one round trip regardless of how big the document
 * has grown. No answer history is kept here — `attempts.ts` has that, and a
 * growing array in a hot document is how this kind of thing turns into a bill.
 *
 * The per-answer increments are written by the attempt flush rather than here,
 * so twenty answers cost one write to this document instead of twenty. What is
 * left here are the exam-level counters and the reads.
 *
 * Firebase is imported inside the functions, never at the top. `normalizeTopic`
 * is imported by every question surface on the site, including the public pages
 * a search engine sent someone to, and a static import here would put the whole
 * Firestore bundle on all of them.
 */

import { BLUEPRINT } from "@/lib/exam";

export type Stats = {
  answered: number;
  correct: number;
  examsStarted: number;
  examsFinished: number;
  /** best exam percentage so far */
  bestPct: number;
  /** keyed by blueprint category or topic slug */
  byTopic: Record<string, { answered: number; correct: number }>;
  updatedAt: string;
};

export const EMPTY_STATS: Stats = {
  answered: 0,
  correct: 0,
  examsStarted: 0,
  examsFinished: 0,
  bestPct: 0,
  byTopic: {},
  updatedAt: "",
};

/**
 * The three surfaces name a category three ways: the exam uses blueprint keys
 * ("safe-care"), a drill uses topic slugs ("cardiovascular"), and the sample
 * questions carry the NCSBN label as prose ("Pharmacological therapies", which
 * is also written in full elsewhere). Left alone, one category would pile up
 * under three keys and every total would be wrong.
 *
 * Prose is folded onto its blueprint key; slugs are left alone, because a
 * subject like cardiovascular is genuinely finer-grained than the client-need
 * category above it and worth keeping apart.
 */
export function normalizeTopic(topic: string | undefined): string | undefined {
  if (!topic) return undefined;
  if (BLUEPRINT.some((c) => c.key === topic)) return topic;

  /* Match on words rather than the exact string: the same category appears
     both as "Pharmacological therapies" and "Pharmacological and parenteral
     therapies", and only the first word separates any two of them. */
  const first = topic.trim().toLowerCase().split(/\s+/)[0];
  const match = BLUEPRINT.find((c) => c.name.toLowerCase().startsWith(first));
  return match ? match.key : topic;
}

/** users/{uid}/stats/summary — one document, so reading it is one round trip. */
async function statsDoc() {
  const [{ getDb }, { getSnapshot: getSession }, { doc }] = await Promise.all([
    import("@/lib/firebase"),
    import("@/lib/session"),
    import("firebase/firestore"),
  ]);
  const db = getDb();
  const session = getSession();
  if (!db || !session) return null;
  return doc(db, "users", session.uid, "stats", "summary");
}

async function bump(fields: Record<string, unknown>) {
  try {
    const ref = await statsDoc();
    if (!ref) return;
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, { ...fields, updatedAt: new Date().toISOString() }, { merge: true });
  } catch {
    /* signed out, offline, or rules — losing a counter is not worth
       interrupting a question for, and the next write tries again */
  }
}

export async function recordExamStarted() {
  const { increment } = await import("firebase/firestore");
  await bump({ examsStarted: increment(1) });
}

/** `bestPct` is not a counter, so it is read before it is written. */
export async function recordExamFinished(pct: number) {
  try {
    const ref = await statsDoc();
    if (!ref) return;
    const { getDoc, increment, setDoc } = await import("firebase/firestore");
    const current = await getDoc(ref);
    const best = (current.data()?.bestPct as number | undefined) ?? 0;
    await setDoc(
      ref,
      {
        examsFinished: increment(1),
        bestPct: Math.max(best, pct),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    /* see bump */
  }
}

export async function readStats(): Promise<Stats | null> {
  try {
    const ref = await statsDoc();
    if (!ref) return null;
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { ...EMPTY_STATS, ...(snap.data() as Partial<Stats>) };
  } catch {
    return null;
  }
}

/** Accuracy as a whole percentage, or null when nothing has been answered yet. */
export function accuracy(stats: Stats): number | null {
  return stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : null;
}

/**
 * Topics ranked weakest first, ignoring any with too few answers to mean
 * anything — three questions is noise, and calling it a weakness would send
 * someone off to drill the wrong thing.
 */
export function weakest(stats: Stats, minimum = 4) {
  return Object.entries(stats.byTopic)
    .filter(([, t]) => t.answered >= minimum)
    .map(([key, t]) => ({ key, ...t, pct: Math.round((t.correct / t.answered) * 100) }))
    .sort((a, b) => a.pct - b.pct);
}
