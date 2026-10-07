import { readQuiz } from "@/lib/quiz";
import { answerQuestion } from "@/lib/quiz-answer";

/**
 * Called by the answer page's script once a real browser has shown it.
 * The token says who and which question; lib/quiz-answer.ts marks it.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { t?: string; c?: number | "skip" };
  const t = body.t ? readQuiz(body.t) : null;
  if (!t) return new Response(null, { status: 400 });
  const done = await answerQuestion(t, typeof body.c === "number" ? body.c : "skip");
  return new Response(null, { status: done ? 204 : 404 });
}
