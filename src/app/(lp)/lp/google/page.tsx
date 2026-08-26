import type { Metadata } from "next";
import { FaqList } from "@/components/Blocks";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpCheck, LpClose, LpCross, LpFacts, LpHeader, LpSection } from "@/components/lp/LpKit";
import { LpSticky } from "@/components/lp/LpSticky";
import { PRICING_FAQ, QUESTIONS, REVIEWERS, SITE } from "@/lib/content";

/**
 * Google Ads landing page — "free nclex practice questions", "nclex practice
 * test", "nclex questions with rationales".
 *
 * Search traffic arrives already knowing what it wants, so this page does not
 * sell the category. It matches the query in the H1, hands over the thing that
 * was searched for inside the first screen, and then answers the two questions
 * that stop a high-intent click converting: is it really free, and who wrote it.
 */

const SRC = "google";

export const metadata: Metadata = {
  title: { absolute: `Free NCLEX Practice Questions with Rationales | ${SITE.name}` },
  description: `Answer real NCLEX-RN practice questions free, right on this page. ${SITE.freeQuestions} questions with full rationales when you make an account — no card, no trial that charges you.`,
  alternates: { canonical: "/lp/google" },
  // An ad landing page must not compete with the SEO pages it borrows from.
  robots: { index: false, follow: true },
};

const FACTS = [
  {
    value: SITE.totalQuestions.toLocaleString(),
    label: "Questions across the full NCSBN test plan",
  },
  { value: "8", label: "Client-need categories, weighted like the exam" },
  { value: String(SITE.freeQuestions), label: "Free questions, no card asked for" },
  { value: `$${SITE.price}`, label: "A month for everything, cancel in one click" },
];

const FREE_IN = [
  `${SITE.freeQuestions} real NCLEX-RN questions`,
  "The full rationale on every one, right or wrong",
  "Select-all-that-apply and dosage items included",
  "Your weakest categories named after you finish",
];
const FREE_OUT = [
  "Next Gen case studies",
  "Timed readiness exams",
  "A study plan built from your results",
];

const PAID_IN = [
  `All ${SITE.totalQuestions.toLocaleString()} questions`,
  "Next Gen case studies",
  "Timed readiness exams",
  "A study plan built from your results",
  "14-day refund, no questions asked",
];

export default function GoogleLandingPage() {
  return (
    <>
      <LpHeader src={SRC} />

      {/* ------------------------------------------------------------- hero */}
      <LpSection className="pt-9 pb-4 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-8">
            <p className="eyebrow inline-flex rounded-full border border-rule bg-paper-2 px-3 py-1.5">
              NCLEX-RN · updated {SITE.updated}
            </p>

            <h1 className="mt-4 text-[2rem] leading-[1.06] sm:text-[2.625rem]">
              Free NCLEX practice questions{" "}
              <span className="mark">with the rationale attached</span>
            </h1>

            <p className="mt-5 max-w-xl font-body text-[1.0625rem] leading-[1.65] text-ink-2 sm:text-[1.125rem]">
              Not a sample of a sample. The question beside this one is drawn from the same{" "}
              {SITE.totalQuestions.toLocaleString()} items nurses wrote and reviewed for us, and you
              can answer it now without an account. {SITE.freeQuestions} more are free the moment
              you make one.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <CtaLink src={SRC}>Start free — {SITE.freeQuestions} questions →</CtaLink>
              <span className="font-mono text-[11px] text-muted">
                No card. Not a trial that starts charging.
              </span>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2">
              {["Full rationales", "SATA included", "Dosage calculations", "Weak topics named"].map(
                (t) => (
                  <li
                    key={t}
                    className="rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-mono text-[11px] text-ink-2"
                  >
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* The searched-for thing, inside the first screen on a desktop and
              one thumb-flick down on a phone. */}
          <div>
            <QuestionSet
              label="Try one now"
              questions={[QUESTIONS["safe-011"], QUESTIONS["pharm-212"], QUESTIONS["pharm-104"]]}
              gate={{
                eyebrow: `That was 3 of ${SITE.totalQuestions.toLocaleString()}`,
                headline: `${SITE.freeQuestions} more are free`,
                body: "Make an account with an email and keep going. We hold your results so the site can tell you which of the eight categories is actually costing you marks.",
                cta: { label: "Start free →", href: `${LP_CTA_HREF}?src=${SRC}` },
                exits: [{ label: "See pricing first", href: "/pricing" }],
              }}
            />
          </div>
        </div>
      </LpSection>

      {/* ------------------------------------------------------------ facts */}
      <LpSection className="pt-16">
        <LpFacts items={FACTS} />
      </LpSection>

      {/* ---------------------------------------------------- free vs. paid */}
      <LpSection className="pt-16">
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">The offer, in full</p>
          <h2 className="mt-3 max-w-2xl text-[1.75rem] sm:text-[2.125rem]">
            What &ldquo;free&rdquo; means here, spelled out
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border-2 border-ink bg-white p-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow !text-ink">Free account</p>
              <p className="font-mono text-[1.75rem] leading-none tracking-[-0.03em] text-ink">$0</p>
            </div>
            <ul className="mt-6 flex flex-col gap-2.5">
              {FREE_IN.map((f) => (
                <LpCheck key={f}>{f}</LpCheck>
              ))}
              {FREE_OUT.map((f) => (
                <LpCross key={f}>{f}</LpCross>
              ))}
            </ul>
            <CtaLink src={SRC} className="btn btn-primary mt-7 w-full">
              Start free →
            </CtaLink>
            <p className="mt-3 text-center font-mono text-[11px] text-muted">
              Email and password. There is no card field on the form.
            </p>
          </div>

          <div className="rounded-sm border border-rule bg-white p-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow">Full access</p>
              <p className="font-mono text-[1.75rem] leading-none tracking-[-0.03em] text-ink">
                ${SITE.price}
                <span className="text-base text-muted"> /mo</span>
              </p>
            </div>
            <ul className="mt-6 flex flex-col gap-2.5">
              {PAID_IN.map((f) => (
                <LpCheck key={f}>{f}</LpCheck>
              ))}
            </ul>
            <p className="mt-7 font-body text-[0.9375rem] leading-relaxed text-ink-2">
              You will have answered {SITE.freeQuestions} questions before this price is mentioned
              to you again. One plan, no annual toggle, cancel in one click.
            </p>
          </div>
        </div>
      </LpSection>

      {/* -------------------------------------------------------- who wrote */}
      <LpSection className="pt-16">
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">Who writes the items</p>
          <h2 className="mt-3 max-w-2xl text-[1.75rem] sm:text-[2.125rem]">
            Every question is signed off by a nurse, not a content mill
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {REVIEWERS.map((r) => (
            <div key={r.name} className="rounded-sm border border-rule bg-white p-6">
              <p className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                {r.name}
              </p>
              <p className="mt-1 font-mono text-[11px] text-teal">{r.credentials}</p>
              <p className="mt-3 text-[0.875rem] font-semibold text-ink-2">{r.role}</p>
              <p className="mt-2 font-body text-[0.9375rem] leading-relaxed text-muted">{r.note}</p>
            </div>
          ))}
        </div>
      </LpSection>

      {/* --------------------------------------------------------- the FAQ */}
      <LpSection className="pt-16">
        <div className="max-w-3xl">
          <div className="border-t border-rule pt-5">
            <p className="eyebrow">Before you sign up</p>
            <h2 className="mt-3 text-[1.75rem] sm:text-[2.125rem]">
              The four things people ask us first
            </h2>
          </div>
          <div className="mt-7">
            <FaqList items={PRICING_FAQ} />
          </div>
        </div>
      </LpSection>

      <LpClose
        src={SRC}
        heading={
          <>
            {SITE.freeQuestions} free questions. <span className="mark">No card.</span>
          </>
        }
        sub="Full rationales on every item, and the eight categories ranked by how much each one is costing you."
        cta="Start free →"
        note="Cancel anytime · 14-day refund"
      />

      <LpSticky
        src={SRC}
        label="Start free →"
        note={`${SITE.freeQuestions} free questions · no card`}
      />
    </>
  );
}
