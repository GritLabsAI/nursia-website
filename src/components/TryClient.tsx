"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AppHeader } from "@/components/SiteHeader";
import { QuestionSet } from "@/components/QuestionSet";
import { QUESTIONS, SITE, TOPICS } from "@/lib/content";
import {
  FREE_ALLOWANCE,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/session";

const FIRST_SESSION = [
  QUESTIONS["pharm-104"],
  QUESTIONS["sata-101"],
  QUESTIONS["risk-066"],
];

export function TryClient() {
  /* Read straight from the session store — no mount effect, and the server
     render (no session) matches the first client paint. */
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const used = session?.questionsUsed ?? 0;
  const left = Math.max(0, FREE_ALLOWANCE - used);
  const spent = left === 0;

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
            So we can save your progress, count your free questions down, and tell you which topics
            are costing you marks. Email and password, no card.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="btn btn-primary">
              Sign up free →
            </Link>
            <Link href="/nclex-practice-questions" className="btn btn-ghost">
              10 questions with no account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader questionsLeft={left} />

      <div className="mx-auto max-w-[1140px] px-5 py-10 sm:px-8 sm:py-14">
        <p className="eyebrow">{session.email}</p>
        <h1 className="mt-3 text-[2rem] leading-tight sm:text-[2.5rem]">
          Welcome — <span className="mark">pick where to start</span>
        </h1>
        <p className="mt-4 max-w-xl font-body text-[1.0625rem] leading-relaxed text-ink-2">
          You have {left} of your {FREE_ALLOWANCE} free questions left. Progress saves from here,
          so a rationale you read today shows up in your review list tomorrow.
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border-2 border-ink bg-white p-6">
            <p className="eyebrow !text-ink">Recommended first</p>
            <h2 className="mt-3 text-[1.375rem]">Diagnostic · 8 questions</h2>
            <p className="mt-3 font-body text-[0.9375rem] leading-relaxed text-ink-2">
              One question from each category. It takes about six minutes and it ends with a ranked
              list of what to drill — which is the only thing worth knowing in week one.
            </p>
            <button type="button" className="btn btn-primary mt-6 w-full">
              Start diagnostic
            </button>
          </div>

          <div className="rounded-sm border border-rule bg-white p-6">
            <p className="eyebrow">If you already know</p>
            <h2 className="mt-3 text-[1.375rem]">Pick a topic</h2>
            <p className="mt-3 font-body text-[0.9375rem] leading-relaxed text-ink-2">
              Go straight to your weak area. Eight sets, weighted the way the test plan weights
              them.
            </p>
            <details className="mt-5">
              <summary className="btn btn-ghost w-full cursor-pointer list-none">
                Browse 8 topics
              </summary>
              <ul className="mt-3 grid gap-2">
                {TOPICS.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/nclex-practice-questions/${t.slug}`}
                      className="flex items-center gap-3 rounded-sm border border-rule px-3 py-2.5 text-[0.875rem] text-ink-2 transition-colors hover:border-ink"
                    >
                      {t.name}
                      <span className="ml-auto font-mono text-[11px] text-teal">{t.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>

        {/* the session itself */}
        <div className="mt-14 max-w-2xl">
          <QuestionSet questions={FIRST_SESSION} label="Free tier · saved to your review list" />
        </div>

        {/* At question 50 this is a paywall, not a gate: they see the readiness
            estimate they earned before they see a price. */}
        <div
          className={`mt-12 max-w-2xl rounded-sm border p-6 ${
            spent ? "border-ink bg-paper-2" : "border-dashed border-rule bg-white"
          }`}
        >
          <p className="eyebrow">{spent ? "Free tier used" : `At question ${FREE_ALLOWANCE}`}</p>
          <h2 className="mt-3 text-[1.375rem]">
            {spent
              ? `You have used your ${FREE_ALLOWANCE} free questions.`
              : "What happens when the free tier runs out"}
          </h2>
          <p className="mt-3 font-body text-[0.9375rem] leading-relaxed text-ink-2">
            {SITE.totalQuestions - FREE_ALLOWANCE} questions left in full access. We show you the
            readiness estimate you earned first, then the price — in that order, because the
            estimate is the thing you worked for.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link href="/pricing" className="btn btn-ghost">
              See pricing
            </Link>
            <span className="font-mono text-[11px] text-muted">
              ${SITE.price}/mo · cancel in one click · 14-day refund
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
