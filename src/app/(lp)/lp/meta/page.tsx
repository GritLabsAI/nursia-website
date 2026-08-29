import type { Metadata } from "next";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpCheck, LpClose, LpHeader, LpSection } from "@/components/lp/LpKit";
import { LpSticky } from "@/components/lp/LpSticky";
import { QUESTIONS, SITE } from "@/lib/content";

/**
 * Meta Ads landing page — Instagram and Facebook feed traffic.
 *
 * Nobody here went looking for us. They were scrolling, a thumbnail stopped
 * them, and they arrived with about two seconds of patience on a phone held in
 * one hand. So this page is built as a scroll: one idea per screen, big type,
 * the demo as the payoff rather than the proof, and the CTA never more than a
 * screen away.
 *
 * Copy note: Meta's personal-attributes policy forbids implying we know
 * something about the reader ("struggling with SATA?"). Every line here is
 * about how the exam is written, never about how the reader is doing.
 */

const SRC = "meta";

export const metadata: Metadata = {
  title: { absolute: `The NCLEX asks what you would do next | ${SITE.name}` },
  description: `Knowing the content and answering the question are two different skills. Practise the second one on ${SITE.freeQuestions} free NCLEX-RN questions with full rationales. No card.`,
  alternates: { canonical: "/lp/meta" },
  robots: { index: false, follow: true },
};

/** The three beats of the argument. One screen each on a phone. */
const BEATS = [
  {
    n: "01",
    h: "Four options. All four are things a nurse does.",
    p: "That is the whole trick of the exam. It rarely offers you a wrong answer — it offers you four defensible ones and asks which comes first. Content review never trains that, because content review has one right answer per fact.",
  },
  {
    n: "02",
    h: "The ranking underneath never changes.",
    p: "Airway before breathing before circulation. Assess before intervene. Least invasive first. Once you can see which rule an item is written against, the four defensible options stop looking alike — and the same handful of rules keeps coming back all day.",
  },
  {
    n: "03",
    h: "Which is a thing you learn by getting it wrong.",
    p: "So every rationale here explains the option you picked, not only the one that was right. That is the part that moves a score, and it is why the free tier includes the rationales rather than dangling them behind the price.",
  },
];

const GET = [
  `${SITE.freeQuestions} real NCLEX-RN questions, free`,
  "The full rationale on every one — right or wrong",
  "Select-all-that-apply, dosage, and prioritisation items",
  "Your weakest categories named when you finish",
  "No card, and no trial that quietly starts charging",
];

export default function MetaLandingPage() {
  return (
    <>
      <LpHeader src={SRC} />

      {/* -------------------------------------------------------------- hook */}
      <LpSection className="pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <p className="eyebrow">NCLEX-RN practice · written by nurses</p>
          <h1 className="mt-4 text-[2.375rem] leading-[1.02] sm:text-[3.5rem]">
            The NCLEX does not ask what you know.
            <br className="hidden sm:block" />{" "}
            <span className="mark">It asks what you would do next.</span>
          </h1>
          <p className="mt-6 font-body text-[1.125rem] leading-[1.6] text-ink-2 sm:text-[1.3125rem]">
            Which is a different skill from the one nursing school graded you on — and it is
            trainable. Here is one item, and then the {SITE.freeQuestions} free ones.
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
            label="One real item"
            questions={[QUESTIONS["medsurg-088"], QUESTIONS["sata-101"]]}
            gate={{
              eyebrow: "Two down",
              headline: `${SITE.freeQuestions} more, free`,
              body: "Same items, same rationales, no card. Make an account and the site starts keeping score so it can tell you which category to spend Saturday on.",
              cta: { label: "Start free →", href: `${LP_CTA_HREF}?src=${SRC}` },
              exits: [{ label: "Or browse questions with no account", href: "/nclex-practice-questions" }],
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

      {/* ------------------------------------------------------- objections */}
      <LpSection className="pt-20">
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">The three thoughts you are having</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              q: "“Free means a demo.”",
              a: `Not here — the ${SITE.freeQuestions} are the real items with the real rationales, and they stay yours whether or not you ever pay.`,
            },
            {
              q: "“Something will charge my card.”",
              a: "The signup form has no card field on it. There is nothing set up that could charge you, which is why we can say it this plainly.",
            },
            {
              q: "“AI wrote these, didn't it.”",
              a: "Three nurses write and review the bank — a lead item writer, a critical-care reviewer, and a reviewer who maps each item to the NCSBN plan.",
            },
          ].map((o) => (
            <div key={o.q} className="rounded-sm border border-rule bg-white p-6">
              <p className="font-display text-[1.0625rem] font-bold leading-snug tracking-[-0.02em] text-ink">
                {o.q}
              </p>
              <p className="mt-3 font-body text-[0.9375rem] leading-[1.65] text-ink-2">{o.a}</p>
            </div>
          ))}
        </div>

        <ul className="mt-10 flex flex-col gap-2.5 border-t border-rule pt-6 sm:flex-row sm:flex-wrap sm:gap-x-8">
          {[
            "1,200 items across the full test plan",
            "Cancel in one click",
            "14-day refund",
          ].map((f) => (
            <LpCheck key={f}>{f}</LpCheck>
          ))}
        </ul>
      </LpSection>

      <LpClose
        src={SRC}
        heading={
          <>
            Start with <span className="mark">one question.</span>
          </>
        }
        sub={`Then ${SITE.freeQuestions - 1} more, free, with the rationale on every one. It takes an email and about four minutes.`}
        cta="Start free →"
        note="No card · cancel anytime"
      />

      <LpSticky src={SRC} label="Start free →" note={`${SITE.freeQuestions} questions · no card`} />
    </>
  );
}
