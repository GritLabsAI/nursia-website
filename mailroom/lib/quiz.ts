import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NURSIA_BANK } from "./content.generated";
import type { Brand, Settings } from "./db";

/**
 * Questions you answer by clicking in the email.
 *
 * An email can't run code, so each option is a link. The link carries a
 * signed token saying who this is, which questions are in today's set, which
 * one this is and how the earlier ones went. Clicking an option opens a page
 * that marks it, explains every option, keeps the running score and shows the
 * next question, whose options are links of the same kind. Nothing about the
 * set has to be stored before the email goes out; answers are stored as they
 * come in.
 *
 * Questions: Nursia's come from the bank in this repo (src/lib/bank, compiled
 * in). PrepClever's come from its own notification_quiz_of_day /
 * notification_quiz_questions tables, for the exam the recipient chose.
 */

export type Question = {
  id: string;
  topic: string;
  stem: string;
  options: string[];
  answer: number;
  rationale: string;
  /** Per-option explanation, where the source has one (Nursia's bank does). */
  why?: string[];
};

export type QuizToken = {
  /** brand */ b: Brand;
  /** recipient */ e: string;
  /** the day's set for this person — the dedupe key for answers */ k: string;
  /** question ids, in order */ q: string[];
  /** which question this link answers */ i: number;
  /** results so far: "1" right, "0" wrong, "s" skipped */ r: string;
  /** PrepClever exam id, so the right table rows are read */ x?: string;
  /** exam name, for the page heading */ n?: string;
};

const secret = () => process.env.APP_SECRET || process.env.EMAIL_UNSUB_SECRET || "";

export function signQuiz(p: QuizToken) {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 22);
  return `${body}.${mac}`;
}

export function readQuiz(token: string): QuizToken | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 22));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/* ── question sources ─────────────────────────────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);

/** A small seeded shuffle, so a date always picks the same questions. */
function seeded(seed: string) {
  let h = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function nursiaDaily(date: string, n: number): Question[] {
  const rand = seeded(`nursia:${date}`);
  const topics = [...new Set(NURSIA_BANK.map((q) => q.topic))].sort(() => rand() - 0.5);
  /* One question from each of n different topics, so a set feels varied. */
  return topics.slice(0, n).map((topic) => {
    const pool = NURSIA_BANK.filter((q) => q.topic === topic);
    const q = pool[Math.floor(rand() * pool.length)];
    return { ...q, topic: q.topic.replace(/-/g, " ") };
  });
}

function nursiaById(qid: string): Question | undefined {
  const q = NURSIA_BANK.find((x) => x.id === qid);
  return q ? { ...q, topic: q.topic.replace(/-/g, " ") } : undefined;
}

async function prepcleverRest(path: string) {
  const url = process.env.SUPABASE_URL_PREPCLEVER?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY_PREPCLEVER;
  if (!url || !key) throw new Error("PrepClever Supabase isn't configured");
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`PrepClever questions: ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

const pcQuestion = (r: Record<string, unknown>): Question => ({
  id: String(r.question_id),
  topic: String(r.topic ?? ""),
  stem: String(r.stem ?? ""),
  options: (r.options as string[]) ?? [],
  answer: Number(r.correct_index),
  rationale: String(r.explanation ?? ""),
});

const PC_COLS = "question_id,topic,stem,options,correct_index,explanation";

/** The exam's quiz-of-the-day first, then the rest from its question pool, fixed by date. */
async function prepcleverDaily(examId: string, date: string, n: number): Promise<Question[]> {
  const [qod] = await prepcleverRest(`notification_quiz_of_day?select=${PC_COLS}&exam_id=eq.${examId}&quiz_date=eq.${date}&limit=1`);
  const out: Question[] = qod ? [pcQuestion(qod)] : [];
  if (out.length < n) {
    const pool = await prepcleverRest(`notification_quiz_questions?select=${PC_COLS}&exam_id=eq.${examId}&order=question_id&limit=400`);
    const rand = seeded(`prepclever:${examId}:${date}`);
    const picks = pool.filter((p) => String(p.question_id) !== out[0]?.id).sort(() => rand() - 0.5);
    out.push(...picks.slice(0, n - out.length).map(pcQuestion));
  }
  return out;
}

async function prepcleverById(qid: string): Promise<Question | undefined> {
  const [r] = await prepcleverRest(`notification_quiz_questions?select=${PC_COLS}&question_id=eq.${qid}&limit=1`);
  if (r) return pcQuestion(r);
  const [d] = await prepcleverRest(`notification_quiz_of_day?select=${PC_COLS}&question_id=eq.${qid}&limit=1`);
  return d ? pcQuestion(d) : undefined;
}

/** Someone without a chosen exam (an uploaded list, say) gets the most-taken one. */
async function defaultPrepcleverExam() {
  const rows = await prepcleverRest(`notification_quiz_of_day?select=exam_id&quiz_date=eq.${today()}&limit=50`);
  return rows[0] ? String(rows[0].exam_id) : "";
}

export async function getQuestion(t: QuizToken, idx: number) {
  const qid = t.q[idx];
  if (!qid) return undefined;
  return t.b === "nursia" ? nursiaById(qid) : prepcleverById(qid);
}

/* ── the email side ───────────────────────────────────────────────────── */

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/* One set per person per day is cached for the life of the function, so a
   send to 1,000 people reads PrepClever's tables once per exam, not 1,000 times. */
const setCache = new Map<string, Promise<Question[]>>();

/** The variables a quiz email renders: the first question, with every option a marking link. */
export async function quizForEmail(brand: Brand, vars: Record<string, string>, settings: Settings, n: number) {
  const date = today();
  let examId = brand === "prepclever" ? vars.exam_id || "" : "";
  if (brand === "prepclever" && !examId) examId = await defaultPrepcleverExam();
  const cacheKey = `${brand}:${examId}:${date}`;
  if (!setCache.has(cacheKey)) setCache.set(cacheKey, brand === "nursia" ? Promise.resolve(nursiaDaily(date, n)) : prepcleverDaily(examId, date, n));
  const questions = await setCache.get(cacheKey)!;
  if (!questions.length) return undefined;

  const email = (vars.email || "preview@mailroom").toLowerCase();
  const key = `${brand}:${date}:${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
  const base: QuizToken = { b: brand, e: email, k: key, q: questions.map((q) => q.id), i: 0, r: "", x: examId || undefined, n: vars.exam || undefined };
  const token = signQuiz(base);
  const site = settings.siteUrl.replace(/\/$/, "");
  const q = questions[0];
  return {
    total: questions.length,
    topic: q.topic,
    stem: q.stem,
    options: q.options.map((text, idx) => ({ letter: LETTERS[idx], text, url: `${site}/q/${token}?c=${idx}` })),
    skip_url: `${site}/q/${token}?c=skip`,
  };
}

export { LETTERS };
