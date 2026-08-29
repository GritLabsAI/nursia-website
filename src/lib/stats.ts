/**
 * What a candidate has actually done, accumulated on their account.
 *
 * The exam document holds one sitting. This holds the running total across
 * every sitting and every topic drill, which is the thing that answers "am I
 * getting better, and at what" — and the thing a study plan would be built
 * from later.
 *
 * Counters only, updated with Firestore's atomic increment. That matters for
 * two reasons: two tabs answering questions cannot clobber each other's
 * totals, and a write costs one round trip regardless of how big the document
 * has grown. No answer history is kept here — the per-sitting documents
 * already have that, and a growing array in a hot document is how this kind of
 * thing turns into a bill.
 *
 * A failure never surfaces to the person answering. Losing a counter is not
 * worth interrupting a question for, and the next answer writes again.
 */

import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { BLUEPRINT } from "@/lib/exam";
import { getDb } from "@/lib/firebase";
import { getSnapshot as getSession } from "@/lib/session";

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
function statsDoc() {
  const db = getDb();
  const session = getSession();
  if (!db || !session) return null;
  return doc(db, "users", session.uid, "stats", "summary");
}

async function bump(fields: Record<string, unknown>) {
  const ref = statsDoc();
  if (!ref) return;
  try {
    await setDoc(ref, { ...fields, updatedAt: new Date().toISOString() }, { merge: true });
  } catch {
    /* signed out, offline, or rules — the answer itself is already recorded
       on the sitting, and the next write tries again */
  }
}

/**
 * One answered question. `topic` is the blueprint category in the exam and the
 * topic slug in a drill; both are useful, and keeping them in one map means a
 * weak area shows up wherever it was found.
 */
export function recordAnswer(topic: string | undefined, correct: boolean) {
  const key = normalizeTopic(topic);
  const fields: Record<string, unknown> = {
    answered: increment(1),
    correct: increment(correct ? 1 : 0),
  };
  if (key) {
    fields.byTopic = {
      [key]: { answered: increment(1), correct: increment(correct ? 1 : 0) },
    };
  }
  void bump(fields);
}

export function recordExamStarted() {
  void bump({ examsStarted: increment(1) });
}

/** `bestPct` is not a counter, so it is read before it is written. */
export async function recordExamFinished(pct: number) {
  const ref = statsDoc();
  if (!ref) return;
  try {
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
  const ref = statsDoc();
  if (!ref) return null;
  try {
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
