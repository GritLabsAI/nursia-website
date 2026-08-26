"use client";

import Link from "next/link";
import { useState } from "react";
import { Cross, Tick, WhyBlock } from "@/components/practice/Rationale";
import { clock, PASS_MARK, scoreExam, type ExamItem } from "@/lib/exam";
import type { ExamState } from "@/lib/exam-session";

/**
 * The report.
 *
 * Two things it has to do, in this order: say whether that was a pass, and say
 * which categories cost the marks. Everything else — the fifty rationales — is
 * underneath for whoever wants it, collapsed so the verdict is not buried in
 * it.
 */

function verdictFor(pct: number, expired: boolean) {
  if (expired && pct < PASS_MARK)
    return {
      head: "The clock ended this one.",
      body: "Unanswered items score as wrong, so this percentage is about pacing as much as knowledge. Two minutes an item is the budget the real exam gives you — if you ran out here, that is the first thing to drill.",
    };
  if (pct >= 80)
    return {
      head: "Comfortably above the line.",
      body: "At this level the exam is not the thing standing between you and a licence. Keep the weakest category below on a review cycle and sit another set in a week to confirm it holds.",
    };
  if (pct >= PASS_MARK)
    return {
      head: "That is a pass.",
      body: "Above the line, but not by enough to stop. The category breakdown below is where the next few sessions should go — a pass built on one strong category is fragile.",
    };
  if (pct >= 45)
    return {
      head: "Close, and fixable.",
      body: "Most of this gap is two or three categories rather than the whole test plan. Work the weakest ones below, then sit a fresh fifty — the questions are drawn again each time.",
    };
  return {
    head: "This needs real work.",
    body: "A score here means content, not technique. Read every rationale below — not only the ones you missed — then come back to a fresh fifty rather than retaking this one from memory.",
  };
}

export function ExamResults({
  items,
  state,
  onRetake,
}: {
  items: ExamItem[];
  state: ExamState;
  onRetake: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "missed">("missed");

  const score = scoreExam(items, state.answers);
  const verdict = verdictFor(score.pct, state.expired);
  const unanswered = state.answers.filter((a) => a === null).length;

  const taken = state.finishedAt
    ? (new Date(state.finishedAt).getTime() - new Date(state.startedAt).getTime()) / 1000
    : 0;

  const rows = items
    .map((item, i) => ({ item, i, ok: state.answers[i] === item.question.answer }))
    .filter((r) => filter === "all" || !r.ok);

  return (
    <div className="mx-auto max-w-[52rem] px-5 pb-24 pt-8 sm:px-8">
      <p className="eyebrow">Exam report · {state.answers.length} questions</p>

      {/* ------------------------------------------------- the number */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <p className="font-mono text-[3.5rem] leading-none text-ink">
          {score.pct}
          <span className="text-[2rem] text-muted">%</span>
        </p>
        <p className="font-mono text-[0.875rem] text-muted">
          {score.correct} of {score.total} correct
        </p>
        <span
          className={`rounded-sm px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white ${
            score.passed ? "bg-correct" : "bg-wrong"
          }`}
        >
          {score.passed ? "Above the line" : "Below the line"}
        </span>
      </div>

      {/* one mark per question, in the order they came */}
      <div className="mt-5 flex gap-[3px]" aria-hidden>
        {items.map((item, i) => (
          <span
            key={item.question.id}
            className={`h-[4px] flex-1 rounded-full ${
              state.answers[i] === null
                ? "bg-rule"
                : state.answers[i] === item.question.answer
                  ? "bg-correct"
                  : "bg-wrong"
            }`}
          />
        ))}
      </div>

      <h1 className="mt-7 text-[1.75rem] leading-tight sm:text-[2.125rem]">{verdict.head}</h1>
      <p className="mt-3 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2">
        {verdict.body}
      </p>

      <p className="mt-5 font-mono text-[11px] text-muted">
        {clock(taken)} taken
        {unanswered > 0 && ` · ${unanswered} left unanswered`} · pass line drawn at {PASS_MARK}%
      </p>

      {/* --------------------------------------------- by category */}
      <div className="mt-12">
        <p className="eyebrow">Where the marks went</p>
        <ul className="mt-4 flex flex-col gap-3">
          {score.byCategory
            .slice()
            .sort((a, b) => a.pct - b.pct)
            .map((row) => (
              <li key={row.category.key}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                    {row.category.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    {row.correct}/{row.total} · {row.category.share} of the real exam
                  </p>
                  <p className="ml-auto font-mono text-[0.8125rem] tabular-nums text-ink">
                    {row.pct}%
                  </p>
                </div>
                <div className="mt-1.5 h-[6px] rounded-full bg-paper-2" aria-hidden>
                  <div
                    className={`h-full rounded-full ${
                      row.pct >= PASS_MARK ? "bg-correct" : "bg-wrong"
                    }`}
                    style={{ width: `${Math.max(row.pct, 2)}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* --------------------------------------------- the rationales */}
      <div className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">Every question, with the reasoning</p>
          <div className="ml-auto flex gap-1.5">
            {(["missed", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`min-h-9 rounded-sm border px-3 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  filter === f
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-white text-ink-2 hover:border-ink"
                }`}
              >
                {f === "missed" ? `Missed (${score.total - score.correct})` : `All ${score.total}`}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-5 rounded-sm border border-correct/35 bg-correct/[0.04] p-5 font-body text-[0.9375rem] leading-relaxed text-ink-2">
            Nothing missed. Switch to all {score.total} if you want to check the reasoning on the
            ones you got right — on a set this clean that is where the remaining value is.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {rows.map(({ item, i, ok }) => {
              const isOpen = open === i;
              return (
                <li key={item.question.id} className="rounded-sm border border-rule bg-white">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start gap-3 p-3.5 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
                        ok ? "bg-correct" : "bg-wrong"
                      }`}
                    >
                      {ok ? <Tick className="h-2.5 w-2.5" /> : <Cross className="h-2.5 w-2.5" />}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[0.875rem] leading-snug text-ink-2 ${
                        isOpen ? "" : "line-clamp-1"
                      }`}
                    >
                      {i + 1}. {item.question.stem}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`mt-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="reveal border-t border-rule px-3.5 pb-4 pt-4">
                      {state.answers[i] === null && (
                        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-wrong">
                          Not answered — the clock ran out
                        </p>
                      )}
                      <WhyBlock question={item.question} picked={state.answers[i]} />
                      <div className="mt-4 border-l-2 border-teal pl-4">
                        <p className="eyebrow">Key takeaway</p>
                        <p className="mt-2 font-body text-[0.875rem] leading-[1.65] text-ink-2">
                          {item.question.rationale}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* --------------------------------------------- what happens next */}
      <div className="mt-12 rounded-sm border-2 border-ink bg-paper-2 p-6">
        <p className="eyebrow !text-ink">Next</p>
        <h2 className="mt-3 text-[1.375rem]">Sit another fifty, or drill the weak ones</h2>
        <p className="mt-3 max-w-xl font-body text-[0.9375rem] leading-relaxed text-ink-2">
          A retake draws fifty fresh questions, so it is a new exam rather than this one from
          memory. If you would rather work a category first, the topic sets give you the rationale
          after every question instead of at the end.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={onRetake}>
            Sit a fresh fifty →
          </button>
          <Link href="/practice" className="btn btn-ghost">
            Drill by topic
          </Link>
        </div>
      </div>
    </div>
  );
}
