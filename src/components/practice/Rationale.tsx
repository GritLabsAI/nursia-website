/**
 * The per-option breakdown, shared by the topic drill and the exam report.
 *
 * It was written for the drill first and lived inside it; the exam needs the
 * identical thing on its review list, and two copies of this would drift.
 */

import type { BankQuestion } from "@/lib/bank/types";

export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export const Tick = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Cross = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Not just which option was right, but a line on each of the three that were
 * not. `picked` is null where nobody answered — an item the clock ate, or a
 * row in the review list.
 */
export function WhyBlock({
  question,
  picked,
}: {
  question: BankQuestion;
  picked: number | null;
}) {
  if (!question.why.length) return null;

  return (
    <div>
      <p className="eyebrow">Why each option is right or wrong</p>
      <ul className="mt-3 flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.answer;
          const youPicked = picked === i && !isCorrect;
          return (
            <li
              key={i}
              className={`flex gap-3 rounded-sm border p-3 ${
                isCorrect ? "border-correct/35 bg-correct/[0.04]" : "border-rule bg-white"
              } ${youPicked ? "border-wrong/45 bg-wrong/[0.04]" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white ${
                  isCorrect ? "bg-correct" : "bg-muted/60"
                }`}
              >
                {isCorrect ? <Tick className="h-2.5 w-2.5" /> : <Cross className="h-2.5 w-2.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-semibold leading-snug text-ink">
                  <span className="font-mono text-muted">{LETTERS[i]}. </span>
                  {opt}
                  {youPicked && (
                    <span className="ml-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-wrong">
                      your answer
                    </span>
                  )}
                </p>
                <p className="mt-1 font-body text-[0.875rem] leading-[1.6] text-ink-2">
                  {question.why[i]}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
