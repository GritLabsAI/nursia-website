import { recordAnswer } from "@/lib/db";
import { getQuestion, readQuiz } from "@/lib/quiz";

/**
 * Called by the answer page's script once a real browser has shown it.
 * The token says who and which question; the server works out right or wrong
 * itself, so a forged request can't record a correct answer.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { t?: string; c?: number | "skip" };
  const t = body.t ? readQuiz(body.t) : null;
  if (!t) return new Response(null, { status: 400 });
  const q = await getQuestion(t, t.i);
  if (!q) return new Response(null, { status: 404 });
  const choice = body.c === "skip" || typeof body.c !== "number" ? -1 : body.c;
  await recordAnswer({ quizKey: t.k, idx: t.i, brand: t.b, email: t.e, questionId: q.id, choice, correct: choice === q.answer });
  return new Response(null, { status: 204 });
}
