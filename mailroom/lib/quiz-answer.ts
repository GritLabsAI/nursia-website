import { getAnswer, recordAnswer } from "./db";
import { getQuestion, type Question, type QuizToken } from "./quiz";
import { sendQuizResults } from "./quiz-results";

/**
 * Records one answer, from the answer page or from inside the email. The
 * server works out right or wrong itself, so a forged request can't record a
 * correct answer, and the first answer to a question stands.
 */
export async function answerQuestion(t: QuizToken, given: number | "skip"): Promise<
  { question: Question; choice: number; earlier: boolean } | undefined
> {
  const question = await getQuestion(t, t.i);
  if (!question) return undefined;
  const choice = given === "skip" || !(Number.isInteger(given) && given >= 0 && given < question.options.length) ? -1 : given;

  const prior = await getAnswer(t.k, t.i);
  if (!prior) {
    await recordAnswer({ quizKey: t.k, idx: t.i, brand: t.b, email: t.e, questionId: question.id, choice, correct: choice === question.answer });
  }
  /* The last question of the set: score and every answer go to their inbox. */
  if (t.i === t.q.length - 1) await sendQuizResults(t).catch((e) => console.error("quiz results email failed", e));
  return {
    question,
    choice: prior ? prior.choice : choice,
    earlier: Boolean(prior),
  };
}
