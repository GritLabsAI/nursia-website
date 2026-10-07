import { answersFor, lifetimeFor } from "@/lib/db";
import { LETTERS, readQuiz, type QuizToken } from "@/lib/quiz";
import { answerQuestion } from "@/lib/quiz-answer";

/**
 * Where the answer forms inside the AMP version of the daily quiz email post.
 * Gmail (and Yahoo, Mail.ru) send the tap here through their proxy and show
 * the JSON back in the email, so the reader never leaves their inbox.
 *
 * The email holds no answers: the right option and the scores come from
 * here, after the answer is recorded. A GET (the email's amp-list) gives the
 * lifetime score as the email opens; each answer's reply carries it updated.
 *
 * CORS is AMP for Email's own: version 2 sends AMP-Email-Sender and wants it
 * allowed back; older clients send Origin + __amp_source_origin instead.
 */
export const dynamic = "force-dynamic";

function ampHeaders(req: Request) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  const sender = req.headers.get("amp-email-sender");
  if (sender) {
    h.set("AMP-Email-Allow-Sender", sender);
    return h;
  }
  const origin = req.headers.get("origin");
  const source = new URL(req.url).searchParams.get("__amp_source_origin");
  if (origin) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
  }
  if (source) {
    h.set("AMP-Access-Control-Allow-Source-Origin", source);
    h.set("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin");
  }
  return h;
}

const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: ampHeaders(req) });

export function OPTIONS(req: Request) {
  const h = ampHeaders(req);
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, AMP-Email-Sender");
  return new Response(null, { status: 204, headers: h });
}

/** Today's set and everything before it, as the email shows them. */
async function scores(t: QuizToken) {
  const [today, life] = await Promise.all([answersFor(t.k), lifetimeFor(t.b, t.e)]);
  return { today: { right: today.filter((a) => a.correct).length, answered: today.length, total: t.q.length }, life };
}

export async function GET(req: Request) {
  const t = readQuiz(new URL(req.url).searchParams.get("t") ?? "");
  if (!t) return json(req, { items: [] }, 400);
  const s = await scores(t).catch(() => undefined);
  return json(req, { items: s ? [{ ...s.life, today: s.today.right, todayTotal: s.today.total }] : [] });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => undefined);
  const t = readQuiz(String(form?.get("t") ?? ""));
  if (!t) return json(req, { error: "This question link has expired." }, 400);
  /* "o2" for the third option, "skip" for skip. */
  const raw = String(form?.get("c") ?? "skip");
  const done = await answerQuestion(t, /^o\d+$/.test(raw) ? Number(raw.slice(1)) : "skip").catch((e) => {
    console.error("amp quiz answer failed", e);
    return undefined;
  });
  if (!done) return json(req, { error: "Couldn't save that answer." }, 500);

  const { question: q, choice } = done;
  const verdict = choice < 0 ? "skip" : choice === q.answer ? "right" : "wrong";
  const right = `${LETTERS[q.answer]} · ${q.options[q.answer]}`;
  const s = await scores(t);
  return json(req, {
    verdict,
    headline: verdict === "right" ? `Correct: ${right}` : `${verdict === "skip" ? "Skipped" : "Not quite"}. It's ${right}`,
    earlier: done.earlier,
    today: s.today,
    life: s.life,
  });
}
