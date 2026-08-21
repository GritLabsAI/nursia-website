"use client";

import { useState } from "react";
import Link from "next/link";
import { TopicIcon } from "@/components/TopicIcon";
import type { BankQuestion } from "@/lib/bank/types";
import type { IconKey } from "@/lib/icons";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const Tick = ({ className }: { className?: string }) => (
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

const Cross = ({ className }: { className?: string }) => (
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
 * The A–D breakdown. This is the part of the mockup worth keeping above
 * everything else: not just which option was right, but a line on each of the
 * three that were not. `picked` is null in the review list, where the row for
 * your answer is still flagged.
 */
function WhyBlock({ question, picked }: { question: BankQuestion; picked: number | null }) {
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

function QuestionCard({
  question,
  index,
  total,
  onAnswered,
  onNext,
}: {
  question: BankQuestion;
  index: number;
  total: number;
  onAnswered: (picked: number) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && picked === question.answer;
  const isLast = index === total - 1;

  function stateOf(i: number) {
    if (!checked) return picked === i ? "picked" : undefined;
    if (i === question.answer) return "correct";
    if (i === picked) return "wrong";
    return undefined;
  }

  function submit() {
    if (picked === null || checked) return;
    setChecked(true);
    onAnswered(picked);
  }

  return (
    <div className="px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-ink">
          {question.id}
        </span>
        <span className="h-3 w-px bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">Single answer</span>
      </div>

      <p className="mt-4 font-body text-[1.0625rem] leading-[1.62] text-ink sm:text-[1.125rem]">
        {question.stem}
      </p>

      <div role="radiogroup" aria-label="Answer options" className="mt-5 flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className="qopt"
            data-state={stateOf(i)}
            disabled={checked}
            aria-pressed={picked === i}
            onClick={() => setPicked(i)}
          >
            <span className="qkey" aria-hidden>
              {LETTERS[i]}
            </span>
            <span className="font-body text-[0.9375rem] leading-[1.55] text-ink-2 sm:text-base">
              {opt}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
        <span className="font-mono text-[11px] text-muted">
          Question {index + 1} of {total}
        </span>
        {checked ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {isLast ? "See how you did →" : "Next question →"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={picked === null}
            onClick={submit}
          >
            Check answer
          </button>
        )}
      </div>

      {/* Kept in the DOM at all times so the rationale ships in the server HTML
          and stays crawlable; `hidden` only controls the reveal. */}
      <div hidden={!checked} className={checked ? "reveal mt-7" : "mt-7"}>
        <p
          className={`flex items-center gap-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] ${
            correct ? "text-correct" : "text-wrong"
          }`}
        >
          {correct ? <Tick className="h-4 w-4" /> : <Cross className="h-4 w-4" />}
          {correct
            ? "Correct"
            : `Not quite — the answer is ${LETTERS[question.answer]}`}
        </p>

        <div className="mt-5">
          <WhyBlock question={question} picked={picked} />
        </div>

        <div className="mt-5 border-l-2 border-teal pl-4 sm:pl-5">
          <p className="eyebrow">Key takeaway</p>
          <p className="mt-2 font-body text-[0.9375rem] leading-[1.68] text-ink-2 sm:text-base">
            {question.rationale}
          </p>
        </div>
      </div>
    </div>
  );
}

function Results({
  topicName,
  questions,
  picks,
  onRetry,
  onClose,
  closeLabel,
}: {
  topicName: string;
  questions: BankQuestion[];
  picks: number[];
  onRetry: () => void;
  onClose?: () => void;
  closeLabel: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const total = questions.length;
  const score = picks.reduce((n, p, i) => n + (p === questions[i].answer ? 1 : 0), 0);
  const pct = Math.round((score / total) * 100);

  const verdict =
    pct >= 80
      ? {
          head: "Strong set.",
          body: `You are testing well above the pass line on ${topicName.toLowerCase()}. Keep this one on a light review cycle and put the hours into a weaker topic.`,
        }
      : pct >= 60
        ? {
            head: "Almost there.",
            body: `You are close on ${topicName.toLowerCase()}. Read the rationales for the ones you missed — most of the gap here is recognition, not knowledge.`,
          }
        : {
            head: "This one needs work.",
            body: `${topicName} is a weak area right now. Work through the rationales below, then run the set again in a day or two.`,
          };

  return (
    <div className="px-5 py-7 sm:px-7">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-mono text-[2.5rem] leading-none text-ink">
          {score}
          <span className="text-muted">/{total}</span>
        </p>
        <p className="font-mono text-[0.8125rem] text-muted">{pct}% correct</p>
      </div>

      {/* one tick per question, in order — the shape of the set at a glance */}
      <div className="mt-4 flex gap-1" aria-hidden>
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={`h-[3px] flex-1 rounded-full ${
              picks[i] === q.answer ? "bg-correct" : "bg-wrong"
            }`}
          />
        ))}
      </div>

      <h3 className="mt-6 text-[1.375rem] sm:text-[1.5rem]">{verdict.head}</h3>
      <p className="mt-2 max-w-xl font-body text-[0.9375rem] leading-[1.65] text-ink-2 sm:text-base">
        {verdict.body}
      </p>

      <p className="eyebrow mt-8">Review all {total} questions</p>
      <ul className="mt-3 flex flex-col gap-2">
        {questions.map((q, i) => {
          const ok = picks[i] === q.answer;
          const isOpen = open === i;
          return (
            <li key={q.id} className="rounded-sm border border-rule bg-white">
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
                  {i + 1}. {q.stem}
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
                  <WhyBlock question={q} picked={picks[i] ?? null} />
                  <div className="mt-4 border-l-2 border-teal pl-4">
                    <p className="eyebrow">Key takeaway</p>
                    <p className="mt-2 font-body text-[0.875rem] leading-[1.65] text-ink-2">
                      {q.rationale}
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-7 flex flex-wrap gap-3 border-t border-rule pt-5">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Run the set again
        </button>
        {onClose ? (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {closeLabel}
          </button>
        ) : (
          <Link href="/signup" className="btn btn-ghost">
            Unlock 50 more, free →
          </Link>
        )}
      </div>
    </div>
  );
}

export type DrillTopic = { slug: string; name: string; icon: IconKey; category: string };

/**
 * A whole topic set, answered in place: question, check, per-option breakdown,
 * next — then a scored review of all ten. Lifted from the practice mockup and
 * rebuilt on the site's own card, rules, and type.
 */
export function TopicDrill({
  topic,
  questions,
  onClose,
  closeLabel = "Pick another topic",
}: {
  topic: DrillTopic;
  questions: BankQuestion[];
  onClose?: () => void;
  closeLabel?: string;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  /** bumped on retry so every QuestionCard remounts with empty state */
  const [run, setRun] = useState(0);

  const total = questions.length;
  const answered = done ? total : i;

  function retry() {
    setI(0);
    setPicks([]);
    setDone(false);
    setRun((r) => r + 1);
  }

  return (
    <div className="qcard overflow-hidden">
      <div className="flex items-center gap-3.5 border-b border-rule bg-paper-2 px-5 py-3.5 sm:px-7">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-rule bg-white text-teal">
          <TopicIcon name={topic.icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
            {topic.name}
          </p>
          <p className="font-mono text-[11px] text-muted">
            {done ? "Set complete" : `Question ${i + 1} of ${total}`}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close this set"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-white hover:text-ink"
          >
            <Cross className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="h-[3px] bg-rule" aria-hidden>
        <div
          className="h-full bg-teal transition-[width] duration-300"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>

      {done ? (
        <Results
          topicName={topic.name}
          questions={questions}
          picks={picks}
          onRetry={retry}
          onClose={onClose}
          closeLabel={closeLabel}
        />
      ) : (
        /* Every question stays mounted-but-hidden so the full set is in the
           server HTML — the same trick QuestionSet uses on the SEO pages. */
        questions.map((q, idx) => (
          <div key={q.id} hidden={idx !== i}>
            <QuestionCard
              key={`${q.id}-${run}`}
              question={q}
              index={idx}
              total={total}
              onAnswered={(p) => setPicks((prev) => [...prev, p])}
              onNext={() => (idx === total - 1 ? setDone(true) : setI(idx + 1))}
            />
          </div>
        ))
      )}
    </div>
  );
}
