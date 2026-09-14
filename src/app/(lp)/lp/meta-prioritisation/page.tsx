import type { Metadata } from "next";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpViewed } from "@/components/lp/LpViewed";
import { LpCheck, LpClose, LpHeader, LpSection } from "@/components/lp/LpKit";
import { LpSticky } from "@/components/lp/LpSticky";
import { QUESTIONS, SITE } from "@/lib/content";

/**
 * Meta Ads landing page — the prioritisation angle.
 *
 * Message match for AD09 (four call lights, one of you), AD10 (which lab do
 * you check first) and AD03 (the exam shutting off at 85). All three are about
 * the same thing: the exam asks for an ordering, and an ordering is the one
 * thing a content review cannot hand you.
 *
 * The demo leads with safe-011 — literally "which client should the nurse
 * assess first" — because the ad asked that exact question and the page has
 * about two seconds to prove it is the same conversation.
 *
 * Copy note: Meta's personal-attributes policy forbids implying we know
 * something about the reader. Every line here is about how the exam is
 * written, never about how the reader is doing.
 */

const SRC = "meta-priority";

export const metadata: Metadata = {
  title: { absolute: `Four call lights. One of you. | ${SITE.name}` },
  description: `Prioritisation is what the NCLEX actually tests, and it is not memorisable. Practise it on ${SITE.freeQuestions} free NCLEX-RN questions with full rationales. No card.`,
  alternates: { canonical: "/lp/meta-prioritisation" },
  robots: { index: false, follow: true },
};

const BEATS = [
  {
    n: "01",
    h: "Every option is something a nurse does.",
    p: "That is the trick of a prioritisation item. It does not offer a wrong answer — it offers four defensible ones and asks which comes first. Content review never trains that, because content review has one right answer per fact.",
  },
  {
    n: "02",
    h: "The ranking underneath never changes.",
    p: "Airway before breathing before circulation. Assess before intervene. Unstable before stable. Least invasive first. Once you can see which rule an item is written against, four lookalike options stop looking alike.",
  },
  {
    n: "03",
    h: "You cannot memorise an ordering. You have to see it.",
    p: "Which is why this is practice rather than a chapter. The rules are half a page; recognising which one an item is built on takes repetitions, and the rationale names the rule every time.",
  },
];

const GET = [
  `${SITE.freeQuestions} real NCLEX-RN questions, free`,
  "Prioritisation, delegation and assess-first items",
  "Every rationale names the rule the item was built on",
  "Select-all-that-apply and dosage items too",
  "No card, and no trial that quietly starts charging",
];

export default function MetaPrioritisationLandingPage() {
  return (
    <>
      <LpViewed src={SRC} />
      <LpHeader src={SRC} />

      {/* -------------------------------------------------------------- hook */}
      <LpSection className="pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <p className="eyebrow">NCLEX-RN practice · written by nurses</p>
          <h1 className="mt-4 text-[2.375rem] leading-[1.02] sm:text-[3.5rem]">
            Four call lights are on. There is one of you.
            <br className="hidden sm:block" />{" "}
            <span className="mark">Which room first?</span>
          </h1>
          <p className="mt-6 font-body text-[1.125rem] leading-[1.6] text-ink-2 sm:text-[1.3125rem]">
            That question is the exam. Not whether the normal range is known — whether it is clear
            which number changes what happens next. Here is one item of it, then the{" "}
            {SITE.freeQuestions} free ones.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <CtaLink src={SRC}>Start free →</CtaLink>
            <span className="font-mono text-[11px] text-muted">
              {SITE.freeQuestions} questions · no card
            </span>
          </div>
        </div>
      </LpSection>

      {/* ------------------------------------------------ the demo, up front */}
      <LpSection className="pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl">
          <QuestionSet
            label="Which client first?"
            questions={[QUESTIONS["safe-011"], QUESTIONS["risk-066"]]}
            gate={{
              eyebrow: "Two down",
              headline: `${SITE.freeQuestions} more, free`,
              body: "Same items, same rationales, no card. Make an account and the site starts keeping score, so it can tell you whether prioritisation is the category to spend Saturday on — or whether it is already fine.",
              cta: { label: "Start free →", href: `${LP_CTA_HREF}?src=${SRC}` },
              exits: [
                {
                  label: "Or browse safe-care questions with no account",
                  href: "/nclex-practice-questions/safe-care",
                },
              ],
            }}
          />
          <p className="mt-4 text-center font-mono text-[11px] text-muted">
            Pick an answer — the rationale opens underneath either way
          </p>
        </div>
      </LpSection>

      {/* ------------------------------------------------------------ beats */}
      <LpSection className="pt-20">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {BEATS.map((b) => (
            <div key={b.n} className="border-t-2 border-ink pt-4">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-teal">
                {b.n}
              </p>
              <h2 className="mt-3 text-[1.375rem] leading-[1.15] sm:text-[1.5rem]">{b.h}</h2>
              <p className="mt-3 font-body text-[1rem] leading-[1.68] text-ink-2">{b.p}</p>
            </div>
          ))}
        </div>
      </LpSection>

      {/* --------------------------------------------- the 85-question thing */}
      <LpSection className="pt-20">
        <div className="rounded-sm border border-rule bg-white p-7 sm:p-10">
          <p className="eyebrow">While we are here</p>
          <h2 className="mt-3 max-w-2xl text-[1.625rem] leading-[1.12] sm:text-[2rem]">
            If the exam shuts off at 85, that is not a verdict.
          </h2>
          <p className="mt-4 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2">
            It is adaptive. It stops when the computer is confident — one way or the other — and it
            gets there by handing out items right at the edge of what the candidate knows. Which is
            also why it feels hard the whole way through for almost everyone. Feeling uncertain is
            the design working, not a score.
          </p>
        </div>
      </LpSection>

      {/* ---------------------------------------------------------- the get */}
      <LpSection className="pt-20">
        <div className="flowsheet rounded-sm bg-ink px-6 py-10 text-paper sm:px-10 sm:py-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
            <div>
              <p className="eyebrow !text-paper/60">Free, permanently</p>
              <h2 className="mt-3 text-[1.875rem] leading-[1.08] text-paper sm:text-[2.25rem]">
                {SITE.freeQuestions} questions and every rationale, for nothing
              </h2>
              <p className="mt-4 font-body text-[1rem] leading-relaxed text-paper/65">
                Full access is ${SITE.price} a month if you ever want the other{" "}
                {(SITE.totalQuestions - SITE.freeQuestions).toLocaleString()}. We would rather you
                decided that after the fiftieth question than before the first.
              </p>
              <CtaLink src={SRC} className="btn btn-invert mt-8">
                Start free →
              </CtaLink>
            </div>

            <ul className="flex flex-col gap-3">
              {GET.map((g) => (
                <li key={g} className="flex items-start gap-3 text-[0.9375rem] text-paper">
                  <span
                    aria-hidden
                    className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-paper/30 bg-paper/10"
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </LpSection>

      <LpSection className="pt-16">
        <ul className="flex flex-col gap-2.5 border-t border-rule pt-6 sm:flex-row sm:flex-wrap sm:gap-x-8">
          {[
            `${SITE.totalQuestions.toLocaleString()} items across the full test plan`,
            "Written and reviewed by three nurses",
            "Cancel in one click",
          ].map((f) => (
            <LpCheck key={f}>{f}</LpCheck>
          ))}
        </ul>
      </LpSection>

      <LpClose
        src={SRC}
        heading={
          <>
            Start with <span className="mark">which room first.</span>
          </>
        }
        sub={`Then ${SITE.freeQuestions - 1} more, free, with the rule named in every rationale. It takes an email and about four minutes.`}
        cta="Start free →"
        note="No card · cancel anytime"
      />

      <LpSticky src={SRC} label="Start free →" note={`${SITE.freeQuestions} questions · no card`} />
    </>
  );
}
