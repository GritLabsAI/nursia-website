"use client";

import Link from "next/link";
import { questionAnswered } from "@/lib/analytics";
import { normalizeTopic, recordAnswer } from "@/lib/stats";
import { useState } from "react";
import type { Question } from "@/lib/content";

const KEYS = ["A", "B", "C", "D", "E", "F"];

const same = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

function QuestionBody({
  question,
  index,
  total,
  onScored,
  onNext,
  isLast,
}: {
  question: Question;
  index: number;
  total: number;
  onScored: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const multi = question.answer.length > 1;
  const correct = checked && same(picked, question.answer);

  function toggle(i: number) {
    if (checked) return;
    setPicked((p) =>
      multi ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i],
    );
  }

  function check() {
    if (!picked.length || checked) return;
    setChecked(true);
    onScored(same(picked, question.answer));
  }

  function stateOf(i: number): string | undefined {
    if (!checked) return picked.includes(i) ? "picked" : undefined;
    if (question.answer.includes(i)) return "correct";
    if (picked.includes(i)) return "wrong";
    return undefined;
  }

  return (
    <div>
      {/* meta rail — mono, because every value in it is data */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-rule px-5 py-3 sm:px-6">
        <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-ink">
          {question.id}
        </span>
        <span className="h-3 w-px bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">{question.category}</span>
        <span className="h-3 w-px bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">{question.type}</span>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {index + 1} / {total}
        </span>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <p className="font-body text-[1.0625rem] leading-[1.62] text-ink sm:text-[1.125rem]">
          {question.stem}
        </p>

        <div
          role={multi ? "group" : "radiogroup"}
          aria-label="Answer options"
          className="mt-5 flex flex-col gap-2"
        >
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="qopt"
              data-state={stateOf(i)}
              disabled={checked}
              aria-pressed={picked.includes(i)}
              onClick={() => toggle(i)}
            >
              <span className="qkey" aria-hidden>
                {KEYS[i]}
              </span>
              <span className="font-body text-[0.9375rem] leading-[1.55] text-ink-2 sm:text-base">
                {opt}
              </span>
            </button>
          ))}
        </div>

        {!checked && (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!picked.length}
              onClick={check}
            >
              Check answer
            </button>
            <span className="font-mono text-[11px] text-muted">
              {multi ? "Select every option that applies — no partial credit" : "Pick one"}
            </span>
          </div>
        )}

        {/* Rationale stays in the DOM at all times so it ships in the static
            HTML and is crawlable; `hidden` only controls the reveal. */}
        <div hidden={!checked} className={checked ? "reveal mt-6" : "mt-6"}>
          <div className="border-l-2 border-teal pl-4 sm:pl-5">
            <p className="eyebrow">
              {checked ? (
                <span className={correct ? "text-correct" : "text-wrong"}>
                  {correct ? "Correct" : "Not quite"} · rationale
                </span>
              ) : (
                "Rationale"
              )}
            </p>
            <p className="mt-2.5 font-body text-[0.9375rem] leading-[1.68] text-ink-2 sm:text-base">
              {question.rationale}
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted">
              Answer:{" "}
              <span className={checked ? "mark mark-draw" : "mark"}>
                {question.answer.map((i) => KEYS[i]).join(", ")}
              </span>
            </p>
          </div>

          <div className="mt-5">
            <button type="button" className="btn btn-ghost" onClick={onNext}>
              {isLast ? "See how you did →" : "Next question →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type GateConfig = {
  /** shown above the headline, e.g. "After 3 questions" */
  eyebrow: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  /** small links out, so the gate is never a dead end */
  exits?: { label: string; href: string }[];
};

/**
 * The signature object on this site: a real question, answerable in place, with
 * the rationale unfolding underneath. Every public page carries one.
 *
 * All questions render into the DOM up front — only visibility changes — so the
 * question set is in the static HTML and crawlable without JavaScript.
 */
export function QuestionSet({
  questions,
  gate,
  label,
}: {
  questions: Question[];
  gate?: GateConfig;
  label?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  /** bumped on restart so every QuestionBody remounts with fresh state */
  const [run, setRun] = useState(0);

  const total = questions.length;

  return (
    <div>
      {label && (
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="eyebrow">{label}</h3>
          <div className="h-px flex-1 bg-rule" aria-hidden />
          <span className="font-mono text-[11px] text-muted">
            {done ? `${score} / ${total}` : `${Math.min(current + 1, total)} of ${total}`}
          </span>
        </div>
      )}

      {/* progress: one tick per question, filled as you go */}
      <div className="mb-4 flex gap-1" aria-hidden>
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors ${
              i < current || done ? "bg-teal" : i === current ? "bg-ink" : "bg-rule"
            }`}
          />
        ))}
      </div>

      <div className="qcard overflow-hidden">
        {questions.map((q, i) => (
          <div key={q.id} hidden={done || i !== current}>
            <QuestionBody
              key={`${q.id}-${run}`}
              question={q}
              index={i}
              total={total}
              isLast={i === total - 1}
              onScored={(ok) => {
                /* These are the sample sets on the public pages, so most of
                   the people answering have no account. The GA4 event still
                   lands; recordAnswer no-ops without a session. */
                questionAnswered({
                  surface: "sample",
                  questionId: q.id,
                  topic: normalizeTopic(q.category),
                  correct: ok,
                  index: i,
                });
                recordAnswer(q.category, ok);
                setScore((s) => s + (ok ? 1 : 0));
              }}
              onNext={() => (i === total - 1 ? setDone(true) : setCurrent(i + 1))}
            />
          </div>
        ))}

        {done && gate && (
          <div className="reveal px-5 py-7 sm:px-6">
            <p className="eyebrow">{gate.eyebrow}</p>
            <h3 className="mt-2 text-2xl sm:text-[1.75rem]">
              You got{" "}
              <span className="mark">
                {score} of {total}
              </span>
            </h3>
            <p className="mt-3 max-w-lg font-body text-[0.9375rem] leading-relaxed text-ink-2 sm:text-base">
              {gate.body}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={gate.cta.href} className="btn btn-primary">
                {gate.cta.label}
              </Link>
              <span className="font-mono text-[11px] text-muted">No card needed</span>
            </div>
            {gate.exits && (
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-rule pt-4">
                {gate.exits.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      className="font-mono text-[11px] text-muted underline decoration-rule underline-offset-4 transition-colors hover:text-teal"
                    >
                      → {e.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-6 font-mono text-[11px] text-muted underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setDone(false);
                setCurrent(0);
                setScore(0);
                setRun((r) => r + 1);
              }}
            >
              Start the set again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
