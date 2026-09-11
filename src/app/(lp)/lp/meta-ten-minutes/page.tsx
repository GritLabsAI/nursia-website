import type { Metadata } from "next";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpCheck, LpClose, LpCross, LpHeader, LpSection } from "@/components/lp/LpKit";
import { LpSticky } from "@/components/lp/LpSticky";
import { QUESTIONS, SITE } from "@/lib/content";

/**
 * Meta Ads landing page — the time angle.
 *
 * Message match for the creative built on ten minutes: AD01 (the walk to the
 * train), AD04 (the commute), AD07 (between shifts), AD11 (ten minutes flat),
 * AD14 (gaps in your day) and AD05 (75 a day). Those ads all make the same
 * promise — prep shaped like the gaps in a working day rather than like a
 * study block nobody has — so this page has to open on that promise and not
 * on a generic "practise for the NCLEX".
 *
 * The demo is two items rather than the usual one. That is the argument: a set
 * is short enough to finish standing up, and finishing is the whole point.
 *
 * Copy note: Meta's personal-attributes policy forbids implying we know
 * something about the reader. Every line here is about how the exam and the
 * day are shaped, never about how the reader is doing.
 */

const SRC = "meta-time";

export const metadata: Metadata = {
  title: { absolute: `Ten minutes is a real study session | ${SITE.name}` },
  description: `A short set and the reasoning behind every answer — sized for a break or a commute. ${SITE.freeQuestions} free NCLEX-RN questions, no card.`,
  alternates: { canonical: "/lp/meta-ten-minutes" },
  robots: { index: false, follow: true },
};

/** What ten minutes actually buys, one screen each on a phone. */
const BEATS = [
  {
    n: "01",
    h: "A set is five questions, not fifty.",
    p: "Short enough to finish on a break, which matters more than it sounds: an unfinished session teaches nothing, and a finished one leaves a score to come back to. The app reopens exactly where the last set stopped.",
  },
  {
    n: "02",
    h: "The rationale is the session.",
    p: "Reading why the right answer was right is the part that transfers to exam day. Seventy-five questions with the reasoning read beats two hundred clicked through — and seventy-five with the reasoning read is a fortnight of commutes.",
  },
  {
    n: "03",
    h: "The habit does the work.",
    p: "Nothing here is built around the marathon Saturday session. It is built around the ten minutes that already exist in a shift, because those are the ones that actually recur.",
  },
];

const GET = [
  `${SITE.freeQuestions} real NCLEX-RN questions, free`,
  "Sets short enough to finish standing up",
  "The full rationale on every one — right or wrong",
  "Picks up where the last set stopped",
  "No card, and no trial that quietly starts charging",
];

export default function MetaTenMinutesLandingPage() {
  return (
    <>
      <LpHeader src={SRC} />

      {/* -------------------------------------------------------------- hook */}
      <LpSection className="pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <p className="eyebrow">NCLEX-RN practice · written by nurses</p>
          <h1 className="mt-4 text-[2.375rem] leading-[1.02] sm:text-[3.5rem]">
            A twelve-hour shift does not leave a three-hour study block.
            <br className="hidden sm:block" />{" "}
            <span className="mark">It leaves the walk to the train.</span>
          </h1>
          <p className="mt-6 font-body text-[1.125rem] leading-[1.6] text-ink-2 sm:text-[1.3125rem]">
            Ten minutes is enough to do a set and actually read why each answer was right. Here are
            two items to prove the shape of it, then the {SITE.freeQuestions} free ones.
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
            label="A set, in about two minutes"
            questions={[QUESTIONS["medsurg-088"], QUESTIONS["basic-055"]]}
            gate={{
              eyebrow: "That was two",
              headline: `${SITE.freeQuestions} more, free`,
              body: "Same items, same rationales, no card. Make an account and it keeps the thread — the next set starts where this one stopped, and the score tells you which category to spend a break on.",
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

      {/* ------------------------------------------------- shape of the prep */}
      <LpSection className="pt-20">
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">What this is, and is not</p>
        </div>
        <div className="mt-8 grid gap-x-12 gap-y-4 sm:grid-cols-2">
          <ul className="flex flex-col gap-3">
            <LpCheck>Short sets, finishable on a break</LpCheck>
            <LpCheck>The reasoning behind every option, not just the key</LpCheck>
            <LpCheck>Resumes exactly where it stopped</LpCheck>
            <LpCheck>Your weakest categories named when you finish</LpCheck>
          </ul>
          <ul className="flex flex-col gap-3">
            <LpCross>Hour-long lecture videos</LpCross>
            <LpCross>A content review you have already done once</LpCross>
            <LpCross>A streak that punishes a day on the ward</LpCross>
            <LpCross>A card field on the signup form</LpCross>
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
            The next ten minutes <span className="mark">are enough.</span>
          </>
        }
        sub={`One set, the rationale on every answer, and ${SITE.freeQuestions} free questions waiting after it. Signing up takes an email and about four minutes.`}
        cta="Start free →"
        note="No card · cancel anytime"
      />

      <LpSticky src={SRC} label="Start free →" note={`${SITE.freeQuestions} questions · no card`} />
    </>
  );
}
