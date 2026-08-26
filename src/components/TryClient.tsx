"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AppHeader } from "@/components/AppHeader";
import { TopicIcon } from "@/components/TopicIcon";
import { EXAM_LENGTH, EXAM_MINUTES, PASS_MARK } from "@/lib/exam";
import {
  getServerSnapshot as examServerSnapshot,
  getSnapshot as examSnapshot,
  getSyncServerState,
  getSyncState,
  subscribe as examSubscribe,
} from "@/lib/exam-session";
import { topicsIn } from "@/lib/content";
import { BANK_COUNTS } from "@/lib/bank/counts";
import { useSession } from "@/lib/useSession";

/**
 * The hub behind the gate.
 *
 * Two things live here and nothing else: the exam, and the topic sets. There
 * is no paywall on either while we are in early access, so this page no longer
 * counts anything down or holds anything back — the old free-tier band was
 * describing a gate that is not there.
 */
export function TryClient() {
  const { session, pending } = useSession();
  const exam = useSyncExternalStore(examSubscribe, examSnapshot, examServerSnapshot);
  const sync = useSyncExternalStore(examSubscribe, getSyncState, getSyncServerState);

  /* Held while Firebase works out whether this browser is signed in — see
     useSession. The gate below must not flash at an account holder. */
  if (pending) {
    return (
      <div className="mx-auto max-w-[1140px] px-5 py-24 sm:px-8">
        <p className="eyebrow text-center">One moment</p>
      </div>
    );
  }

  /* Signed out — the gate is named rather than sprung as a surprise. */
  if (!session) {
    return (
      <div className="mx-auto flex max-w-[1140px] flex-col px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <p className="eyebrow">Practice</p>
          <h1 className="mt-4 text-[2rem] leading-tight sm:text-[2.5rem]">
            Practice needs a free account
          </h1>
          <p className="mt-4 font-body text-[1.0625rem] leading-relaxed text-ink-2">
            So we can hold your exam report and tell you which categories are costing you marks.
            Email and password, no card, and nothing behind a paywall.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="btn btn-primary">
              Start free →
            </Link>
            <Link href="/nclex-practice-questions" className="btn btn-ghost">
              Questions with no account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const answered = exam?.answers.filter((a) => a !== null).length ?? 0;
  const finished = Boolean(exam?.finishedAt);
  const inProgress = Boolean(exam) && !finished;

  const score = exam?.score ?? null;

  const topics = [...topicsIn("category"), ...topicsIn("subject")]
    .map((t) => ({ ...t, bank: BANK_COUNTS[t.slug] ?? 0 }))
    .filter((t) => t.bank > 0);

  return (
    <>
      <AppHeader questionsAnswered={answered} />

      <div className="mx-auto max-w-[1140px] px-5 py-10 sm:px-8 sm:py-14">
        <p className="eyebrow">{session.email}</p>
        <h1 className="mt-3 max-w-2xl text-[2rem] leading-tight sm:text-[2.5rem]">
          {finished ? (
            <>
              Your report is <span className="mark">ready</span>
            </>
          ) : inProgress ? (
            <>
              You have an exam <span className="mark">in progress</span>
            </>
          ) : (
            <>
              Start with the <span className="mark">{EXAM_LENGTH}-question exam</span>
            </>
          )}
        </h1>
        <p className="mt-4 max-w-xl font-body text-[1.0625rem] leading-relaxed text-ink-2">
          Everything here is free while we are in early access — the whole bank, the exam, and
          every rationale. No card, and nothing held back for a paid tier.
        </p>

        {/* Said plainly rather than hidden: their work is safe, but it is
            safe in one browser only, and that is worth knowing before they
            spend a hundred minutes on it. */}
        {sync === "failing" && (
          <p className="mt-6 rounded-sm border border-wrong/40 bg-wrong/[0.04] px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
            Saving to your account is not working right now, so this exam lives only in this
            browser. It will not follow you to another device, and clearing your browser data
            would lose it.
          </p>
        )}

        {/* ------------------------------------------------- the exam */}
        <div className="mt-9 rounded-sm border-2 border-ink bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="eyebrow !text-ink">
              {finished ? "Exam complete" : inProgress ? "Resume" : "Recommended first"}
            </p>
            {finished && score && (
              <span
                className={`rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-white ${
                  score.pct >= PASS_MARK ? "bg-correct" : "bg-wrong"
                }`}
              >
                {score.pct}% · {score.pct >= PASS_MARK ? "above the line" : "below the line"}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-[1.5rem] sm:text-[1.75rem]">
            {EXAM_LENGTH} questions, {EXAM_MINUTES} minutes, one report
          </h2>
          <p className="mt-3 max-w-2xl font-body text-[0.9375rem] leading-relaxed text-ink-2">
            {finished
              ? "Your score, the category breakdown, and a written rationale on all fifty — including a line on each option you did not pick."
              : inProgress
                ? `You are ${answered} of ${EXAM_LENGTH} in, and the clock has been running since you started. Pick it up where you left it.`
                : "Drawn across every client-need category and weighted the way the test plan weights them. No rationale until the end and no going back, because that is what the real thing does."}
          </p>

          {inProgress && (
            <div className="mt-5 h-[3px] rounded-full bg-rule" aria-hidden>
              <div
                className="h-full rounded-full bg-teal"
                style={{ width: `${(answered / EXAM_LENGTH) * 100}%` }}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/exam" className="btn btn-primary">
              {finished ? "Open the report →" : inProgress ? "Resume the exam →" : "Begin →"}
            </Link>
            {finished && (
              <Link href="/practice" className="btn btn-ghost">
                Drill a weak category
              </Link>
            )}
          </div>
        </div>

        {/* ----------------------------------------------- the topics */}
        <div className="mt-14">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="text-[1.375rem]">Or drill a topic</h2>
            <p className="font-mono text-[11px] text-muted">
              Rationale after every question, no clock
            </p>
          </div>

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/nclex-practice-questions/${t.slug}`}
                  className="flex items-center gap-3 rounded-sm border border-rule bg-white px-4 py-3.5 transition-colors hover:border-ink"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-rule bg-paper text-teal">
                    <TopicIcon name={t.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-2">{t.name}</span>
                  <span className="font-mono text-[11px] text-teal">{t.bank}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
