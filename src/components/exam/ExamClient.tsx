"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { FunnelHeader } from "@/components/FunnelHeader";
import { ExamResults } from "@/components/exam/ExamResults";
import { ExamRunner } from "@/components/exam/ExamRunner";
import {
  BLUEPRINT,
  drawExam,
  EXAM_LENGTH,
  EXAM_MINUTES,
  newSeed,
  scoreExam,
  type ExamItem,
} from "@/lib/exam";
import {
  clearExam,
  getServerSnapshot as examServerSnapshot,
  getSnapshot as examSnapshot,
  recordScore,
  startExam,
  subscribe as examSubscribe,
} from "@/lib/exam-session";
import { useSession } from "@/lib/useSession";

/**
 * /exam, in four states: the gate, the brief, the sitting, the report.
 *
 * The questions are drawn in the browser from the seed on the exam state, so
 * an exam survives a refresh and a retake is genuinely a different fifty. No
 * paywall anywhere in here — a free account is the whole price of admission
 * for now, and the report is the product.
 */
export function ExamClient() {
  const { session, pending } = useSession();
  const exam = useSyncExternalStore(examSubscribe, examSnapshot, examServerSnapshot);

  /* Both of these are tagged with the seed they belong to, so a retake shows
     the loader rather than a stale fifty for the frame before the new draw
     lands — no effect has to reset them. */
  const [drawn, setDrawn] = useState<{ seed: number; items: ExamItem[] } | null>(null);
  const [failedSeed, setFailedSeed] = useState<number | null>(null);

  const seed = exam?.seed ?? null;
  const items = drawn && drawn.seed === seed ? drawn.items : null;
  const failed = failedSeed !== null && failedSeed === seed;

  /* One draw per seed. Changing seed — a retake — rebuilds; anything else
     about the exam state (an answer landing) must not. */
  useEffect(() => {
    if (seed === null) return;
    let live = true;
    drawExam(seed)
      .then((questions) => live && setDrawn({ seed, items: questions }))
      .catch(() => live && setFailedSeed(seed));
    return () => {
      live = false;
    };
  }, [seed]);

  /* The hub prints the headline number, and the draw only exists on this
     page — so the score is written down the moment there is one. */
  const finishedAt = exam?.finishedAt ?? null;
  const scored = Boolean(exam?.score);
  useEffect(() => {
    if (!finishedAt || scored || !items || !exam) return;
    const { correct, total, pct } = scoreExam(items, exam.answers);
    recordScore({ correct, total, pct });
  }, [finishedAt, scored, items, exam]);

  /* Firebase has not said yet whether this browser is signed in. Showing the
     gate here would flash a sign-up wall at someone who is already an
     account holder, so hold the page instead. */
  if (pending) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-24 text-center">
          <p className="eyebrow">One moment</p>
        </div>
      </Shell>
    );
  }

  /* ------------------------------------------------------------ gate */
  if (!session) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-20 text-center">
          <p className="eyebrow">The exam</p>
          <h1 className="mt-4 text-[2rem] leading-tight sm:text-[2.5rem]">
            {EXAM_LENGTH} questions under exam conditions
          </h1>
          <p className="mt-4 font-body text-[1.0625rem] leading-relaxed text-ink-2">
            A free account is the whole price — no card, and nothing behind a paywall while we are
            in early access. We need the account only to hold your report.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="btn btn-primary">
              Create a free account →
            </Link>
            <Link href="/nclex-practice-questions" className="btn btn-ghost">
              Questions with no account
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  /* ------------------------------------------------------- the brief */
  if (!exam) {
    return (
      <Shell>
        <Brief onStart={() => startExam(newSeed(), EXAM_LENGTH)} email={session.email} />
      </Shell>
    );
  }

  if (failed) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-20 text-center">
          <h1 className="text-[1.75rem]">The questions did not load</h1>
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink-2">
            Nothing is lost — the exam is held on this device and the same fifty come back. Reload,
            or start again if you would rather.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
              Reload
            </button>
            <button type="button" className="btn btn-ghost" onClick={clearExam}>
              Start over
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!items) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-24 text-center">
          <p className="eyebrow">Drawing your {EXAM_LENGTH}</p>
          <div className="mx-auto mt-6 h-[3px] w-48 overflow-hidden rounded-full bg-rule">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-teal" />
          </div>
        </div>
      </Shell>
    );
  }

  /* ------------------------------------------------------ the report */
  if (exam.finishedAt) {
    return (
      <Shell>
        <ExamResults
          items={items}
          state={exam}
          onRetake={() => startExam(newSeed(), EXAM_LENGTH)}
        />
      </Shell>
    );
  }

  /* ----------------------------------------------------- the sitting */
  return (
    <div className="min-h-dvh bg-paper">
      <ExamRunner items={items} state={exam} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[1140px] px-5 sm:px-8">
      <FunnelHeader altHref="/practice" altLabel="Practice by topic" />
      {children}
    </div>
  );
}

/**
 * The brief. It exists to make the rules explicit before the clock starts,
 * because two of them — no going back, and unanswered scores as wrong — are
 * unpleasant surprises if you meet them at question thirty.
 */
function Brief({ onStart, email }: { onStart: () => void; email: string }) {
  return (
    <div className="max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">{email}</p>
      <h1 className="mt-4 text-[2.25rem] leading-[1.04] sm:text-[3rem]">
        The <span className="mark">{EXAM_LENGTH}-question</span> exam
      </h1>
      <p className="mt-6 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
        Fifty questions drawn across every client-need category and weighted the way the NCSBN test
        plan weights them. It runs like the real thing rather than like a study set: no rationale
        until the end, no going back, and a clock. The report at the end tells you which categories
        are costing you marks.
      </p>

      <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {[
          {
            t: `${EXAM_MINUTES} minutes`,
            d: `Two minutes a question — the same budget the real exam gives you across five hours. The clock keeps running if you close the tab.`,
          },
          {
            t: "No back button",
            d: "Answers are confirmed one at a time and cannot be changed, which is how the NCLEX itself works. You get one confirmation tap before each is locked.",
          },
          {
            t: "No feedback until the end",
            d: "You will not see whether an answer was right while you are sitting. Every rationale, and the line on each wrong option, comes with the report.",
          },
          {
            t: "A calculator",
            d: "Four functions, in the exam bar, for the dosage items — the same thing you get on screen at the test centre.",
          },
        ].map((row) => (
          <div key={row.t}>
            <dt className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
              {row.t}
            </dt>
            <dd className="mt-2 font-body text-[0.9375rem] leading-[1.65] text-ink-2">{row.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 rounded-sm border border-rule bg-white p-6">
        <p className="eyebrow">What you will be asked</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {BLUEPRINT.map((c) => (
            <li key={c.key} className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono text-[0.8125rem] tabular-nums text-ink">
                {String(c.count).padStart(2, "0")}
              </span>
              <span className="text-[0.9375rem] text-ink-2">{c.name}</span>
              <span className="ml-auto font-mono text-[11px] text-muted">
                {c.share} of the real exam
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Begin the exam →
        </button>
        <Link href="/practice" className="btn btn-ghost">
          Not now — drill a topic
        </Link>
      </div>
      <p className="mt-4 font-mono text-[11px] text-muted">
        The clock starts on that button. Nothing here costs anything.
      </p>
    </div>
  );
}
