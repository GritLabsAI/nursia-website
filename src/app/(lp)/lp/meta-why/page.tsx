import type { Metadata } from "next";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpCheck, LpClose, LpCross, LpHeader, LpSection } from "@/components/lp/LpKit";
import { LpSticky } from "@/components/lp/LpSticky";
import { QUESTIONS, SITE } from "@/lib/content";

/**
 * Meta Ads landing page — the rationale angle.
 *
 * Message match for AD12 (tells you why), AD06 (written by nurses, not a
 * textbook committee), AD08 (built to feel hard) and AD13 (weak spots). The
 * common promise in those four is that the explanation is the product — so
 * this page has to lead with an item whose right answer looks wrong, and then
 * explain it. medsurg-088 does that better than anything else in the bank: an
 * oxygen saturation of 88% in COPD reads like an emergency and is not one.
 *
 * The objection this page answers is "AI wrote these", which is the reason
 * the reviewer credit sits mid-page rather than in the footer.
 *
 * Copy note: Meta's personal-attributes policy forbids implying we know
 * something about the reader. Every line here is about how the exam is
 * written, never about how the reader is doing.
 */

const SRC = "meta-why";

export const metadata: Metadata = {
  title: { absolute: `Every answer explains itself | ${SITE.name}` },
  description: `Written by nurses who have sat the exam — and every rationale explains the option you picked, not only the one that was right. ${SITE.freeQuestions} free NCLEX-RN questions, no card.`,
  alternates: { canonical: "/lp/meta-why" },
  robots: { index: false, follow: true },
};

const BEATS = [
  {
    n: "01",
    h: "The rationale covers the option you picked.",
    p: "Not only the key. Knowing why the right answer was right leaves the next lookalike item just as hard; knowing why the one you chose was wrong is the part that moves a score. So the free tier includes the rationales rather than dangling them behind the price.",
  },
  {
    n: "02",
    h: "Three nurses write and review the bank.",
    p: "A lead item writer, a critical-care reviewer, and a reviewer who maps every item to the NCSBN test plan. Not a textbook committee, and not a model left running overnight.",
  },
  {
    n: "03",
    h: "Items are built to feel hard on purpose.",
    p: "The real exam is adaptive — it hands out questions at the edge of what a candidate knows, which is why it feels hard the whole way through for nearly everyone. Practice that feels easy is not preparing anyone for that.",
  },
];

const GET = [
  `${SITE.freeQuestions} real NCLEX-RN questions, free`,
  "A rationale on every option — not just the correct one",
  "Written and reviewed by three registered nurses",
  "Each item mapped to the NCSBN test plan",
  "Your weakest categories named when you finish",
];

export default function MetaWhyLandingPage() {
  return (
    <>
      <LpHeader src={SRC} />

      {/* -------------------------------------------------------------- hook */}
      <LpSection className="pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <p className="eyebrow">NCLEX-RN practice · written by nurses</p>
          <h1 className="mt-4 text-[2.375rem] leading-[1.02] sm:text-[3.5rem]">
            An answer key tells you that you were wrong.
            <br className="hidden sm:block" />{" "}
            <span className="mark">It does not tell you why.</span>
          </h1>
          <p className="mt-6 font-body text-[1.125rem] leading-[1.6] text-ink-2 sm:text-[1.3125rem]">
            Here is an item where the right answer looks like the wrong one. Pick whichever seems
            right — the reasoning opens underneath either way, and that is the whole product.
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
            label="The right answer looks wrong"
            questions={[QUESTIONS["medsurg-088"], QUESTIONS["pharm-104"]]}
            gate={{
              eyebrow: "Two down",
              headline: `${SITE.freeQuestions} more, free`,
              body: "Same items, same rationales, no card. Make an account and the site keeps score, so the categories that keep costing marks get named instead of guessed at.",
              cta: { label: "Start free →", href: `${LP_CTA_HREF}?src=${SRC}` },
              exits: [
                { label: "Or browse questions with no account", href: "/nclex-practice-questions" },
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

      {/* ------------------------------------------------- what a rationale is */}
      <LpSection className="pt-20">
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">What a rationale here actually contains</p>
        </div>
        <div className="mt-8 grid gap-x-12 gap-y-4 sm:grid-cols-2">
          <ul className="flex flex-col gap-3">
            <LpCheck>Why the correct option is correct</LpCheck>
            <LpCheck>Why each distractor is tempting, and where it fails</LpCheck>
            <LpCheck>The rule the item was written against</LpCheck>
            <LpCheck>The numbers that matter, with their reference ranges</LpCheck>
          </ul>
          <ul className="flex flex-col gap-3">
            <LpCross>“Option C is correct.”</LpCross>
            <LpCross>A page reference to a textbook you do not own</LpCross>
            <LpCross>An explanation locked behind the upgrade</LpCross>
            <LpCross>A score with no account of where it came from</LpCross>
          </ul>
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

      <LpClose
        src={SRC}
        heading={
          <>
            Get the <span className="mark">why.</span>
          </>
        }
        sub={`${SITE.freeQuestions} free questions, and an explanation on every option of every one of them. It takes an email and about four minutes.`}
        cta="Start free →"
        note="No card · cancel anytime"
      />

      <LpSticky src={SRC} label="Start free →" note={`${SITE.freeQuestions} questions · no card`} />
    </>
  );
}
