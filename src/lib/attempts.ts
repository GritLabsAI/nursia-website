/**
 * Every answer, kept.
 *
 * `stats.ts` holds the running totals and answers "how am I doing". This holds
 * the individual attempts and answers what totals cannot: which item was
 * missed, what was picked instead, how long it took, and whether the same item
 * was missed again a week later. That is the raw material for the review list
 * and for a study plan built from results rather than from a template.
 *
 * Three things make this affordable and safe to run on every tap:
 *
 * - **Nothing blocks the tap.** An attempt goes into a queue and the UI moves
 *   on. Answering must never wait on a round trip, least of all on ward wifi.
 * - **The queue lives on the device.** It survives a refresh, a closed tab,
 *   and being answered while signed out — those attempts flush on the first
 *   visit that has a session, carrying their own timestamps.
 * - **Firebase is imported dynamically.** Every public page carries a question
 *   card and none of them should pay for the Firestore bundle before someone
 *   actually answers something. The import happens on the first flush.
 *
 * One flush writes one batch: the attempt documents, plus the per-question,
 * per-day, and account-wide counters they roll up into — folded together in JS
 * first, so twenty answers cost four writes rather than eighty.
 */

import type { Surface } from "@/lib/analytics";
import { normalizeTopic } from "@/lib/stats";

export type Attempt = {
  questionId: string;
  surface: Surface;
  /** blueprint key or topic slug, already normalised */
  topic?: string;
  correct: boolean;
  /** what they chose — an array because select-all items exist */
  picked: number[];
  /** what was right, so a report can be rebuilt without the bank */
  answer: number[];
  /** 0-based position in the set it was answered in */
  index?: number;
  secondsTaken?: number;
  /** ties an attempt back to the sitting it belongs to */
  examSeed?: number;
  answeredAt: string;
};

const QUEUE_KEY = "nursia.attempts.pending";

/**
 * How many unsent attempts to keep. Someone can answer a lot of questions
 * offline, but a queue that grows without limit is a localStorage quota error
 * in the middle of an exam. The oldest go first: recent work is the work worth
 * keeping, and the totals they feed are approximate by nature.
 */
const QUEUE_CAP = 500;

/** Attempts per batch. Four writes each, comfortably inside the 500-op limit. */
const BATCH = 20;

/** How long to sit on a queue before sending it, in ms. */
const IDLE_MS = 4000;

let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let warned = false;
let installed = false;

function readQueue(): Attempt[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: Attempt[]) {
  try {
    if (queue.length) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* private mode or quota — the attempt is lost, the answer itself is not */
  }
}

/**
 * Record one answered question. Returns immediately; the write happens later.
 *
 * Safe to call when signed out. The attempt waits on the device and goes up on
 * the first flush that finds a session, which is how the questions someone
 * answers before signing up still land on their account.
 */
export function recordAttempt(attempt: Omit<Attempt, "answeredAt">) {
  if (typeof window === "undefined") return;
  /* First answer of the visit also arms the on-the-way-out flush and sends
     anything a previous visit left behind. */
  startAttemptFlushing();

  const queue = readQueue();
  queue.push({
    ...attempt,
    topic: normalizeTopic(attempt.topic),
    answeredAt: new Date().toISOString(),
  });
  writeQueue(queue.slice(-QUEUE_CAP));

  if (queue.length >= BATCH) {
    void flush();
    return;
  }
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), IDLE_MS);
}

/* The day a counter is filed under — the local date, because a candidate's
   idea of "today" is their own and not UTC's. */
function dayKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** A stable, time-ordered document id, so attempts sort without an index. */
const attemptId = (a: Attempt) =>
  `${new Date(a.answeredAt).getTime()}-${a.questionId}`.replace(/[^\w-]/g, "");

/**
 * Send what is queued.
 *
 * Everything here is caught. A candidate mid-question can do nothing about a
 * failed write, and the queue is not cleared until the batch commits, so a
 * failure costs a retry rather than the data. It is noisy in the console once,
 * because a permanent failure here is nearly always undeployed rules.
 */
export async function flush(): Promise<void> {
  if (flushing || typeof window === "undefined") return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const queue = readQueue();
  if (!queue.length) return;

  flushing = true;
  try {
    const [{ getDb }, { getSnapshot: getSession }, fs] = await Promise.all([
      import("@/lib/firebase"),
      import("@/lib/session"),
      import("firebase/firestore"),
    ]);

    const db = getDb();
    const session = getSession();
    /* Signed out, or auth has not settled yet. The queue keeps. */
    if (!db || !session) return;

    const { doc, increment, writeBatch } = fs;
    const uid = session.uid;

    for (let i = 0; i < queue.length; i += BATCH) {
      const chunk = queue.slice(i, i + BATCH);
      const batch = writeBatch(db);

      /* Fold the counters in memory first: twenty answers on one topic are one
         write rather than twenty, and Firestore charges by the write. */
      const perQuestion = new Map<string, { attempts: number; correct: number; last: Attempt }>();
      const perDay = new Map<string, { answered: number; correct: number }>();
      const perTopic = new Map<string, { answered: number; correct: number }>();
      let answered = 0;
      let correct = 0;

      for (const a of chunk) {
        batch.set(doc(db, "users", uid, "attempts", attemptId(a)), a);

        const q = perQuestion.get(a.questionId) ?? { attempts: 0, correct: 0, last: a };
        perQuestion.set(a.questionId, {
          attempts: q.attempts + 1,
          correct: q.correct + (a.correct ? 1 : 0),
          last: a,
        });

        const day = dayKey(a.answeredAt);
        const d = perDay.get(day) ?? { answered: 0, correct: 0 };
        perDay.set(day, { answered: d.answered + 1, correct: d.correct + (a.correct ? 1 : 0) });

        if (a.topic) {
          const t = perTopic.get(a.topic) ?? { answered: 0, correct: 0 };
          perTopic.set(a.topic, {
            answered: t.answered + 1,
            correct: t.correct + (a.correct ? 1 : 0),
          });
        }

        answered += 1;
        correct += a.correct ? 1 : 0;
      }

      /* users/{uid}/questions/{questionId} — what this account knows about one
         item. `lastCorrect` is what the review list reads: an item since got
         right has left the list, however badly it started. */
      for (const [questionId, q] of perQuestion) {
        batch.set(
          doc(db, "users", uid, "questions", questionId),
          {
            questionId,
            topic: q.last.topic ?? null,
            attempts: increment(q.attempts),
            correct: increment(q.correct),
            lastCorrect: q.last.correct,
            lastPicked: q.last.picked,
            lastAt: q.last.answeredAt,
            lastSurface: q.last.surface,
          },
          { merge: true },
        );
      }

      /* users/{uid}/daily/{yyyy-mm-dd} — one small document a day, which is
         what makes a streak and a "this week" line cheap to read. */
      for (const [day, d] of perDay) {
        batch.set(
          doc(db, "users", uid, "daily", day),
          { date: day, answered: increment(d.answered), correct: increment(d.correct) },
          { merge: true },
        );
      }

      /* The account-wide totals. These used to be written once per answer;
         folding them into the batch is the same numbers for a fraction of the
         writes, and two tabs still cannot clobber each other because every
         field is an atomic increment. */
      const summary: Record<string, unknown> = {
        answered: increment(answered),
        correct: increment(correct),
        updatedAt: new Date().toISOString(),
      };
      if (perTopic.size) {
        summary.byTopic = Object.fromEntries(
          [...perTopic].map(([key, t]) => [
            key,
            { answered: increment(t.answered), correct: increment(t.correct) },
          ]),
        );
      }
      batch.set(doc(db, "users", uid, "stats", "summary"), summary, { merge: true });

      await batch.commit();

      /* Committed — drop exactly this chunk, re-reading first so anything
         answered while the batch was in flight is not thrown away with it. */
      const sent = new Set(chunk.map(attemptId));
      writeQueue(readQueue().filter((a) => !sent.has(attemptId(a))));
    }
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn(
        "[nursia] Attempts are not reaching Firestore, so they are queued on this device. " +
          "Check that firestore.rules is deployed: npx firebase deploy --only firestore:rules",
        error,
      );
    }
  } finally {
    flushing = false;
  }
}

/**
 * Send on the way out.
 *
 * `pagehide` and a hidden `visibilitychange` are the two events a phone
 * actually fires when a browser is dismissed; `beforeunload` is not reliable
 * on mobile at all. Neither can await, so this is best-effort — and it does
 * not need to be better, because whatever misses the boat stays queued.
 */
export function startAttemptFlushing() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  const send = () => void flush();
  window.addEventListener("pagehide", send);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
  /* Anything left over from a previous visit goes now. */
  send();
}

/* ------------------------------------------------------------------ reads */

export type Mastery = {
  questionId: string;
  topic: string | null;
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastPicked: number[];
  lastAt: string;
  lastSurface: Surface;
};

async function ctx() {
  const [{ getDb }, { getSnapshot: getSession }, fs] = await Promise.all([
    import("@/lib/firebase"),
    import("@/lib/session"),
    import("firebase/firestore"),
  ]);
  const db = getDb();
  const session = getSession();
  if (!db || !session) return null;
  return { db, uid: session.uid, fs };
}

/** The most recent attempts, newest first. */
export async function listAttempts(max = 50): Promise<Attempt[]> {
  const c = await ctx();
  if (!c) return [];
  try {
    const { collection, getDocs, limit, orderBy, query } = c.fs;
    const snap = await getDocs(
      query(collection(c.db, "users", c.uid, "attempts"), orderBy("answeredAt", "desc"), limit(max)),
    );
    return snap.docs.map((d) => d.data() as Attempt);
  } catch {
    return [];
  }
}

/**
 * The review list: items whose last outcome was wrong, most recent first.
 *
 * Last outcome rather than ever-wrong, so working through the list actually
 * empties it — a list that only grows is one nobody opens twice.
 */
export async function listMissed(max = 50): Promise<Mastery[]> {
  const c = await ctx();
  if (!c) return [];
  try {
    const { collection, getDocs, limit, orderBy, query, where } = c.fs;
    const snap = await getDocs(
      query(
        collection(c.db, "users", c.uid, "questions"),
        where("lastCorrect", "==", false),
        orderBy("lastAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Mastery);
  } catch {
    /* Nearly always the composite index — the console error carries a link
       that creates it, and firestore.indexes.json declares it. */
    return [];
  }
}

export type Day = { date: string; answered: number; correct: number };

/** The last `days` days that have anything on them, newest first. */
export async function listDays(days = 60): Promise<Day[]> {
  const c = await ctx();
  if (!c) return [];
  try {
    const { collection, getDocs, limit, orderBy, query } = c.fs;
    const snap = await getDocs(
      query(collection(c.db, "users", c.uid, "daily"), orderBy("date", "desc"), limit(days)),
    );
    return snap.docs.map((d) => d.data() as Day);
  } catch {
    return [];
  }
}

/**
 * Consecutive days answered, counting back from today.
 *
 * Yesterday still counts as alive: someone who studies every evening and opens
 * the hub at breakfast has not broken anything, and telling them they have is
 * the fastest way to lose the habit the number exists to encourage.
 */
export function streakOf(days: Day[], now = new Date()): number {
  const have = new Set(days.filter((d) => d.answered > 0).map((d) => d.date));

  const cursor = new Date(now);
  if (!have.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!have.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (have.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
