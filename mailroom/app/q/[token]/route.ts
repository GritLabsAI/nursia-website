import { type NextRequest } from "next/server";
import { getAnswer } from "@/lib/db";
import { getQuestion, readQuiz } from "@/lib/quiz";
import { answerPage, expiredPage, type Marked } from "@/lib/quiz-page";

/**
 * What an answer link in an email opens: /q/<signed token>?c=<option>|skip.
 * Shows the marking and the next question. The answer itself is recorded by
 * the page's script (see lib/quiz-page.ts), not by this request.
 */
export const dynamic = "force-dynamic";

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = readQuiz(token);
  if (!t) return html(expiredPage(), 400);
  const question = await getQuestion(t, t.i).catch(() => undefined);
  if (!question) return html(expiredPage(t.b), 404);

  const raw = req.nextUrl.searchParams.get("c");
  let choice: number | "skip" = raw === "skip" ? "skip" : Number(raw);
  if (choice !== "skip" && !(Number.isInteger(choice) && choice >= 0 && choice < question.options.length)) choice = "skip";

  /* If they've answered this one before, the first answer stands. */
  const prior = await getAnswer(t.k, t.i).catch(() => undefined);
  const priorChoice = prior ? (prior.choice < 0 ? "skip" : prior.choice) : undefined;
  const marked: Marked = { question, choice: priorChoice ?? choice, recordedEarlier: priorChoice !== undefined && priorChoice !== choice };

  const next = t.i + 1 < t.q.length ? await getQuestion(t, t.i + 1).catch(() => undefined) : undefined;
  const all = t.i + 1 >= t.q.length ? await Promise.all(t.q.map((_, i) => getQuestion(t, i).catch(() => undefined))) : [];
  return html(answerPage(t, marked, next, all, req.nextUrl.origin));
}
