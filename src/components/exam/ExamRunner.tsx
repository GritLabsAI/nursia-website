"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator } from "@/components/exam/Calculator";
import { LETTERS } from "@/components/practice/Rationale";
import { clock, EXAM_MINUTES, type ExamItem } from "@/lib/exam";
import { answerAndAdvance, expireExam, secondsLeft, type ExamState } from "@/lib/exam-session";

/**
 * The sitting.
 *
 * Everything the drill does — the tick, the rationale, the per-option
 * breakdown — is deliberately absent here. You pick, you confirm, it is gone.
 * No score so far, no colour on the option you chose, no way back. That is
 * what makes it an exam rather than a set of flashcards, and it is the reason
 * the report at the end means anything.
 */
/** One question, and the two taps that lock it in. */
function Item({
  item,
  index,
  total,
}: {
  item: ExamItem;
  index: number;
  total: number;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const stem = useRef<HTMLParagraphElement>(null);
  const isLast = index === total - 1;

  /* Put the reader at the top of the stem — on a phone the scroll position
     carried over from the last question lands mid-options. */
  useEffect(() => {
    stem.current?.scrollIntoView({ block: "start" });
  }, []);

  function submit() {
    if (picked === null) return;
    /* One confirmation, because the answer cannot be changed afterwards and
       nobody should lose a mark to a mis-tap. */
    if (!confirming) {
      setConfirming(true);
      return;
    }
    answerAndAdvance(index, picked);
  }

  return (
    <div className="qcard mt-6 px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-ink">
          {item.question.id}
        </span>
        <span className="h-3 w-px bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">Single answer</span>
      </div>

      <p
        ref={stem}
        className="mt-4 scroll-mt-28 font-body text-[1.0625rem] leading-[1.62] text-ink sm:text-[1.1875rem]"
      >
        {item.question.stem}
      </p>

      <div role="radiogroup" aria-label="Answer options" className="mt-6 flex flex-col gap-2">
        {item.question.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className="qopt"
            /* "picked" is the only state an option ever shows in here —
               correct and wrong belong to the report, not the sitting. */
            data-state={picked === i ? "picked" : undefined}
            aria-pressed={picked === i}
            onClick={() => {
              setPicked(i);
              setConfirming(false);
            }}
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

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
        <span className="font-mono text-[11px] leading-snug text-muted">
          {confirming
            ? `Locking in ${LETTERS[picked ?? 0]}. This cannot be changed.`
            : "Answers are final — the exam has no back button."}
        </span>
        <button
          type="button"
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={picked === null}
          onClick={submit}
        >
          {confirming ? (isLast ? "Confirm and finish →" : "Confirm →") : "Next question →"}
        </button>
      </div>
    </div>
  );
}

export function ExamRunner({ items, state }: { items: ExamItem[]; state: ExamState }) {
  const [calculator, setCalculator] = useState(false);
  const [left, setLeft] = useState(() => secondsLeft(state, EXAM_MINUTES));

  const index = state.index;
  const item = items[index];

  /* The clock is read off startedAt every second rather than decremented, so a
     tab that slept catches up instead of gaining free time. */
  useEffect(() => {
    const id = setInterval(() => {
      const remaining = secondsLeft(state, EXAM_MINUTES);
      setLeft(remaining);
      if (remaining <= 0) expireExam();
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  if (!item) return null;

  const answered = index;
  const low = left <= 300;

  return (
    /* min-h-dvh so the exam bar, which is sticky inside this container, stays
       pinned for the whole scroll rather than letting go near the footer. */
    <div className="mx-auto min-h-dvh max-w-[52rem] px-5 pb-24 pt-4 sm:px-8">
      {/* ------------------------------------------------ the exam bar */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-rule bg-paper/95 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-[0.8125rem] font-semibold text-ink">
            Question {index + 1}
            <span className="text-muted"> of {items.length}</span>
          </span>

          <span className="h-3 w-px bg-rule" aria-hidden />

          <span
            className="exam-clock font-mono text-[0.8125rem] tabular-nums text-ink-2"
            data-low={low}
            role="timer"
            aria-live="off"
          >
            {clock(left)} left
          </span>

          <button
            type="button"
            onClick={() => setCalculator((c) => !c)}
            aria-pressed={calculator}
            className="ml-auto min-h-9 rounded-sm border border-rule bg-white px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            Calculator
          </button>
        </div>

        <div className="mt-2.5 h-[3px] bg-rule" aria-hidden>
          <div
            className="h-full bg-teal transition-[width] duration-300"
            style={{ width: `${(answered / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Floats rather than pushing the question down the page, so opening it
          does not move the stem you were reading. On a phone there is no
          corner to float in, so it sits at the bottom like a keypad. */}
      {calculator && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-5 sm:sticky sm:inset-x-auto sm:bottom-auto sm:top-[5.75rem] sm:h-0 sm:justify-end sm:px-0">
          <div className="pointer-events-auto">
            <Calculator onClose={() => setCalculator(false)} />
          </div>
        </div>
      )}

      {/* Keyed on the index so every question arrives with a clean slate —
          nothing to reset, and no way for the previous selection to survive
          into the next item. */}
      <Item key={index} item={item} index={index} total={items.length} />

      <p className="mt-5 text-center font-mono text-[11px] text-muted">
        {items.length - answered} to go · rationales for all {items.length} come at the end
      </p>
    </div>
  );
}
