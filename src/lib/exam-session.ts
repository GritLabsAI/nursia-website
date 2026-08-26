/**
 * The exam in progress, and the reports behind it.
 *
 * Two stores in one, and the split matters:
 *
 * - localStorage is the source of truth *during* a sitting. A hundred minutes
 *   is long enough that a refresh, a closed tab, or a phone locking itself
 *   will happen, and none of those may cost someone the exam. Writing an
 *   answer must never wait on a network round trip either — the tap has to
 *   feel instant even on hospital wifi.
 * - Firestore is the record. Every answer mirrors up in the background, so a
 *   cleared browser or a second device picks the sitting up where it was, and
 *   finished reports survive as history.
 *
 * When they disagree, the one that has seen more answers wins: an exam
 * abandoned on a laptop at question 12 must not overwrite the same exam
 * finished on a phone.
 *
 * The clock is derived from `startedAt` rather than counted in memory — a tab
 * that was asleep for ten minutes comes back ten minutes down, which is what
 * an exam clock does.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { getSnapshot as getSession } from "@/lib/session";

const KEY = "nursia.exam";

export type ExamState = {
  /** rebuilds the same fifty questions — see lib/exam drawExam */
  seed: number;
  startedAt: string;
  /** one slot per question; null until answered */
  answers: (number | null)[];
  /** how far in they are; equal to answers.length once every item is in */
  index: number;
  /** set when the last answer lands or the clock runs out */
  finishedAt: string | null;
  /** true when the clock, not the candidate, ended it */
  expired: boolean;
  /**
   * Written once the report has been worked out, so the hub can print the
   * headline number without redrawing fifty questions to recount them.
   */
  score: { correct: number; total: number; pct: number } | null;
};

let snapshot: ExamState | null = null;
let raw: string | null = null;
const listeners = new Set<() => void>();

/**
 * Whether the mirror to Firestore is working.
 *
 * Every sync failure here is caught on purpose — a candidate mid-exam can do
 * nothing about one, and the answer is already safe on the device. But caught
 * silently is how a project ships with its security rules undeployed and
 * nobody notices for a month, so the outcome is recorded and the hub says so
 * quietly. Not an alarm; a fact.
 */
let syncing: "idle" | "ok" | "failing" = "idle";
let warned = false;

export function getSyncState() {
  return syncing;
}

export function getSyncServerState(): "idle" | "ok" | "failing" {
  return "idle";
}

function setSync(next: typeof syncing, error?: unknown) {
  if (next === "failing" && !warned) {
    warned = true;
    /* Loud in the console, because this is nearly always a deployment
       problem — rules not pushed, or Firestore not created. */
    console.warn(
      "[nursia] Exam progress is not reaching Firestore, so it lives only on this device. " +
        "Check that firestore.rules is deployed: npx firebase deploy --only firestore:rules",
      error,
    );
  }
  if (syncing === next) return;
  syncing = next;
  listeners.forEach((l) => l());
}

function read(): ExamState | null {
  const next = window.localStorage.getItem(KEY);
  if (next !== raw) {
    raw = next;
    try {
      snapshot = next ? (JSON.parse(next) as ExamState) : null;
    } catch {
      snapshot = null;
    }
  }
  return snapshot;
}

function write(state: ExamState | null, { sync = true } = {}) {
  if (state) window.localStorage.setItem(KEY, JSON.stringify(state));
  else window.localStorage.removeItem(KEY);
  read();
  listeners.forEach((l) => l());
  if (sync && state) void push(state);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getSnapshot(): ExamState | null {
  return read();
}

export function getServerSnapshot(): ExamState | null {
  return null;
}

/* ------------------------------------------------------------ Firestore */

/** users/{uid}/exams/{seed} — the seed is the exam, so it is the document id. */
function examDoc(seed: number) {
  const db = getDb();
  const session = getSession();
  if (!db || !session) return null;
  return doc(db, "users", session.uid, "exams", String(seed));
}

/** How much of an exam has actually been done — the tiebreaker between copies. */
const progressOf = (state: ExamState) =>
  state.answers.filter((a) => a !== null).length + (state.finishedAt ? 1000 : 0);

/**
 * Mirror upward. A failure never interrupts the sitting — the answer is
 * already safe on the device and the next write tries again — but it is
 * recorded rather than lost, so the hub can say the account is not receiving
 * anything. See setSync.
 */
async function push(state: ExamState) {
  const ref = examDoc(state.seed);
  if (!ref) return;
  try {
    await setDoc(ref, { ...state, updatedAt: new Date().toISOString() });
    setSync("ok");
  } catch (error) {
    /* offline, rules, or auth still settling — the device copy stands */
    setSync("failing", error);
  }
}

/**
 * Called once a session is known. Pulls the newest exam on the account and
 * adopts it if it is further along than whatever is on this device — which is
 * what makes "log in on your phone and carry on" work.
 */
export async function hydrateFromServer(): Promise<void> {
  const db = getDb();
  const session = getSession();
  if (!db || !session) return;

  const local = getSnapshot();

  try {
    /* The one this device already knows about first, then the newest overall
       if this device has nothing. */
    const remote = local
      ? await getDoc(doc(db, "users", session.uid, "exams", String(local.seed)))
      : (
          await getDocs(
            query(
              collection(db, "users", session.uid, "exams"),
              orderBy("startedAt", "desc"),
              limit(1),
            ),
          )
        ).docs[0];

    if (!remote?.exists()) {
      /* Nothing up there yet, but there is something here — mirror it. */
      setSync("ok");
      if (local) void push(local);
      return;
    }

    const state = remote.data() as ExamState;
    setSync("ok");
    if (!local || progressOf(state) > progressOf(local)) write(state, { sync: false });
    else if (progressOf(local) > progressOf(state)) void push(local);
  } catch (error) {
    /* Rules not deployed, offline, or Firestore not enabled — the device copy
       is a complete exam on its own. */
    setSync("failing", error);
  }
}

/** Finished sittings, newest first, for a history list. */
export async function listReports(max = 20): Promise<ExamState[]> {
  const db = getDb();
  const session = getSession();
  if (!db || !session) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "users", session.uid, "exams"),
        orderBy("startedAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs
      .map((d) => d.data() as ExamState)
      .filter((e) => e.finishedAt);
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------- writes */

export function startExam(seed: number, length: number) {
  write({
    seed,
    startedAt: new Date().toISOString(),
    answers: Array.from({ length }, () => null),
    index: 0,
    finishedAt: null,
    expired: false,
    score: null,
  });
}

/** Record an answer and move on. There is no way back — the real exam has none. */
export function answerAndAdvance(index: number, picked: number) {
  const state = getSnapshot();
  if (!state || state.finishedAt) return;

  const answers = state.answers.slice();
  answers[index] = picked;
  const next = index + 1;
  const done = next >= answers.length;

  write({
    ...state,
    answers,
    index: done ? answers.length : next,
    finishedAt: done ? new Date().toISOString() : null,
  });
}

/** The clock ran out. Whatever is answered is what gets scored. */
export function expireExam() {
  const state = getSnapshot();
  if (!state || state.finishedAt) return;
  write({ ...state, finishedAt: new Date().toISOString(), expired: true });
}

/** The report has been scored — keep the number for the hub. */
export function recordScore(score: { correct: number; total: number; pct: number }) {
  const state = getSnapshot();
  if (!state || state.score) return;
  write({ ...state, score });
}

/** Clears the device copy only; the record on the account stays. */
export function clearExam() {
  write(null);
}

/** Seconds left on the clock, from the timestamp rather than from a counter. */
export function secondsLeft(state: ExamState, minutes: number): number {
  const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
  return Math.max(0, minutes * 60 - elapsed);
}
