import Link from "next/link";
import type { Metadata } from "next";
import { QuestionSet } from "@/components/QuestionSet";
import { CtaLink, LP_CTA_HREF } from "@/components/lp/CtaLink";
import { LpClose, LpHeader, LpSection } from "@/components/lp/LpKit";
import { QUESTIONS, SITE } from "@/lib/content";

/**
 * Reddit Ads landing page — r/StudentNurse, r/NCLEX, r/nursing.
 *
 * This audience reads a landing page looking for the catch, and every device
 * that works on Meta reads as a tell here: stock smiles, countdown timers,
 * "join 40,000 students". So the page concedes the frame in the first line,
 * puts the price and the limitations above the pitch, and lets the questions
 * themselves do the selling. The CTA is deliberately the least loud thing on
 * the page — and it is not the only exit, because the ungated practice hub
 * converts this crowd better than a signup wall does.
 */

const SRC = "reddit";

export const metadata: Metadata = {
  title: { absolute: `Nursia, without the pitch | NCLEX practice questions` },
  description: `What it is, what it costs, and what it does not do — before you give us anything. ${SITE.freeQuestions} free NCLEX-RN questions with full rationales, and 200 more with no account at all.`,
  alternates: { canonical: "/lp/reddit" },
  robots: { index: false, follow: true },
};

/** Straight answers, in the order a sceptic asks for them. */
const SPEC: { k: string; v: string }[] = [
  { k: "What it is", v: "An NCLEX-RN question bank. Questions, rationales, timed exams." },
  {
    k: "Bank size",
    v: `${SITE.totalQuestions.toLocaleString()} items across all eight NCSBN client-need categories.`,
  },
  { k: "Free tier", v: `${SITE.freeQuestions} questions, full rationales, kept forever. No card.` },
  { k: "Paid", v: `$${SITE.price}/month. One plan. Cancel in one click. 14-day refund.` },
  { k: "Who writes it", v: "Three nurses — a lead item writer and two reviewers, named on /about." },
  { k: "Account needed", v: "Only to keep your score. 200 questions are readable with no account." },
];

/** The part a Reddit ad normally leaves out. */
const NOT = [
  "There are no video lectures. It is questions and written rationales.",
  "There is no phone app. It is a website that works on a phone.",
  "It does not simulate the adaptive length of the real CAT — the readiness exam is fixed-length.",
  "We are small and new, so there is no giant pass-rate stat to wave at you. We would rather not invent one.",
];

export default function RedditLandingPage() {
  return (
    <>
      <LpHeader src={SRC} />

      {/* ------------------------------------------------------------- lede */}
      <LpSection className="pt-10 sm:pt-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Yes, this is an ad</p>
          <h1 className="mt-4 text-[2rem] leading-[1.06] sm:text-[2.75rem]">
            So here is the whole thing,{" "}
            <span className="mark">before you give us anything</span>
          </h1>
          <p className="mt-6 font-body text-[1.0625rem] leading-[1.7] text-ink-2 sm:text-[1.125rem]">
            You clicked a promoted post, which means the usual next move is a page that hides the
            price until you have handed over an email. We would rather put the price, the limits,
            and three real questions in front of you and let you decide from there. If the items are
            not good, nothing else on this page matters.
          </p>
        </div>
      </LpSection>

      {/* -------------------------------------------------------- the spec */}
      <LpSection className="pt-12">
        <div className="max-w-3xl rounded-sm border border-ink bg-white">
          <p className="eyebrow border-b border-rule px-6 py-3">The whole thing, in six lines</p>
          <dl className="divide-y divide-rule">
            {SPEC.map((s) => (
              <div key={s.k} className="grid gap-1 px-6 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted sm:pt-[3px]">
                  {s.k}
                </dt>
                <dd className="text-[0.9375rem] leading-relaxed text-ink-2">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </LpSection>

      {/* ------------------------------------------------------- the demo */}
      <LpSection className="pt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <div className="border-t border-rule pt-5">
              <p className="eyebrow">Judge it on this</p>
              <h2 className="mt-3 text-[1.75rem] sm:text-[2.125rem]">
                Three items, no account, nothing collected
              </h2>
            </div>
            <p className="mt-5 font-body text-[1rem] leading-[1.7] text-ink-2">
              These are not written for the landing page. They are pulled straight from the bank,
              including the rationale, which is the part worth checking — a bad question bank gives
              you the right answer, a decent one explains why the option you picked was defensible
              and still wrong.
            </p>
            <p className="mt-4 font-body text-[1rem] leading-[1.7] text-ink-2">
              Read the psychosocial one below carefully. If the rationale reads like it was
              generated rather than written by someone who has had that conversation on a unit, you
              will know within a paragraph.
            </p>
            <p className="mt-6 font-mono text-[0.8125rem] leading-relaxed text-muted">
              →{" "}
              <Link
                href="/nclex-practice-questions"
                className="text-teal underline underline-offset-4 hover:text-teal-dark"
              >
                200 more with no account, on the practice hub
              </Link>
            </p>
          </div>

          <div>
            <QuestionSet
              label="From the bank"
              questions={[
                QUESTIONS["psych-030"],
                QUESTIONS["safe-047"],
                QUESTIONS["risk-066"],
              ]}
              gate={{
                eyebrow: "That is the standard",
                headline: "The other 1,197",
                body: `${SITE.freeQuestions} of them are free with an account, and the rest are $${SITE.price} a month whenever you want them. If you would rather not make an account at all, the practice hub is ungated.`,
                cta: { label: "Make a free account", href: `${LP_CTA_HREF}?src=${SRC}` },
                exits: [
                  { label: "Keep reading questions instead", href: "/nclex-practice-questions" },
                  { label: "Pricing", href: "/pricing" },
                ],
              }}
            />
          </div>
        </div>
      </LpSection>

      {/* --------------------------------------------------- what it is not */}
      <LpSection className="pt-16">
        <div className="max-w-3xl">
          <div className="border-t border-rule pt-5">
            <p className="eyebrow">The catch section</p>
            <h2 className="mt-3 text-[1.75rem] sm:text-[2.125rem]">What it does not do</h2>
          </div>
          <ul className="mt-7 flex flex-col gap-4">
            {NOT.map((n) => (
              <li key={n} className="flex gap-4 border-b border-rule pb-4">
                <span aria-hidden className="font-mono text-[0.8125rem] text-wrong">
                  —
                </span>
                <span className="font-body text-[1rem] leading-[1.65] text-ink-2">{n}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-sm border border-rule bg-paper-2 p-6">
            <p className="eyebrow">What we do with your email</p>
            <p className="mt-3 font-body text-[0.9375rem] leading-[1.7] text-ink-2">
              It logs you in and it holds your results. We do not sell it, and the only mail we send
              is about your account. One click unsubscribes you from anything else, and{" "}
              <Link
                href="/contact"
                className="text-teal underline underline-offset-4 hover:text-teal-dark"
              >
                contact us
              </Link>{" "}
              gets a human. There is no card field on the signup form, so nothing on this site is
              able to charge you by accident.
            </p>
          </div>
        </div>
      </LpSection>

      {/* -------------------------------------------------------- the ask */}
      <LpSection className="pt-16">
        <div className="max-w-3xl rounded-sm border-2 border-ink bg-white p-7 sm:p-9">
          <p className="eyebrow">The ask</p>
          <h2 className="mt-3 text-[1.625rem] leading-snug sm:text-[1.875rem]">
            An email, for {SITE.freeQuestions} questions and every rationale
          </h2>
          <p className="mt-4 font-body text-[1rem] leading-[1.7] text-ink-2">
            That is the entire funnel. No card, no trial timer, no upsell sequence — if the free
            fifty are not useful, the paid {SITE.totalQuestions.toLocaleString()} would not have
            been either.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <CtaLink src={SRC}>Make a free account</CtaLink>
            <Link href="/nclex-practice-questions" className="btn btn-ghost">
              Or read questions first
            </Link>
          </div>
        </div>
      </LpSection>

      <LpClose
        src={SRC}
        heading={
          <>
            No pitch, <span className="mark">just the bank.</span>
          </>
        }
        sub={`${SITE.freeQuestions} free questions with full rationales. $${SITE.price} a month after that if you want the rest, and never if you do not.`}
        cta="Make a free account"
        note="No card · cancel in one click · 14-day refund"
      />
    </>
  );
}
