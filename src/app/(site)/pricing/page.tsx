import Link from "next/link";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  CtaBand,
  FaqList,
  FaqSchema,
  Section,
  SectionHead,
} from "@/components/Blocks";
import { PRICING_FAQ, SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "Pricing — one plan, cancel anytime | Nursia" },
  description: `Nursia is $${SITE.price} a month for all 1,200 NCLEX questions, case studies, and readiness exams. A free tier gives you 50 questions with no card.`,
  alternates: { canonical: "/pricing" },
};

const TRAIL = [{ label: "Home", href: "/" }, { label: "Pricing" }];

const FREE = ["50 questions", "Full rationales", "Your weak topics", "No card, ever"];
const FREE_OUT = ["Case studies", "Readiness exams", "Study plan"];
const PAID = [
  "All 1,200 questions",
  "Next Gen case studies",
  "Readiness exams",
  "A study plan built from your results",
  "Review list and progress history",
  "14-day refund, no questions",
];

export default function PricingPage() {
  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />
      <FaqSchema items={PRICING_FAQ} />

      <Section className="pt-10 pb-14">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs trail={TRAIL} />
          <h1 className="text-[2.25rem] leading-[1.04] sm:text-[3rem]">
            One plan. <span className="mark">Cancel whenever.</span>
          </h1>
          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
            There is no third tier and no annual toggle, because at our size every extra choice
            costs sign-ups we cannot afford to lose. Start on the free tier — you are not asked for
            a card to begin, and you will have answered 50 real questions before the price ever
            comes up.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-sm border border-rule bg-white p-7">
              <p className="eyebrow">Free</p>
              <p className="mt-3 font-mono text-[2.5rem] leading-none tracking-[-0.03em] text-ink">
                $0
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted">Forever, not a trial</p>
              <ul className="mt-7 flex flex-col gap-2.5 text-[0.9375rem] text-ink-2">
                {FREE.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="font-mono text-teal">✓</span>
                    {f}
                  </li>
                ))}
                {FREE_OUT.map((f) => (
                  <li key={f} className="flex gap-3 text-muted">
                    <span className="font-mono">—</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-ghost mt-8 w-full">
                Start free
              </Link>
            </div>

            <div className="rounded-sm border-2 border-ink bg-white p-7">
              <div className="flex items-center justify-between gap-4">
                <p className="eyebrow !text-ink">Full access</p>
                <span className="mark font-mono text-[11px] font-medium uppercase tracking-[0.06em]">
                  Most pick this
                </span>
              </div>
              <p className="mt-3 font-mono text-[2.5rem] leading-none tracking-[-0.03em] text-ink">
                ${SITE.price}
                <span className="text-base text-muted"> /mo</span>
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted">Cancel in one click</p>
              <ul className="mt-7 flex flex-col gap-2.5 text-[0.9375rem] text-ink-2">
                {PAID.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="font-mono text-teal">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-primary mt-8 w-full">
                Try 10 questions first →
              </Link>
              <p className="mt-3 text-center font-mono text-[11px] text-muted">
                Even this button goes to the questions, not to checkout
              </p>
            </div>
          </div>

          <div className="mt-16">
            <SectionHead eyebrow="Objections" title="The four things people ask before paying" />
            <div className="mt-7">
              <FaqList items={PRICING_FAQ} id="cancel" />
            </div>
          </div>

          <div className="mt-14 rounded-sm border border-rule bg-paper-2 p-7">
            <p className="eyebrow">Not sure yet</p>
            <p className="mt-3 font-display text-[1.25rem] font-bold leading-snug tracking-[-0.02em]">
              Answer 10 questions with no account first.
            </p>
            <p className="mt-2 max-w-lg font-body text-[0.9375rem] leading-relaxed text-ink-2">
              The practice hub is ungated. If the items are not good, you will not need this page.
            </p>
            <Link
              href="/nclex-practice-questions"
              className="mt-5 inline-block font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
            >
              → 10 free questions, no account
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand
        heading="Start free — 10 questions, no card."
        sub="Free tier first, price later. You will know whether the questions are worth paying for before we ask."
      />
    </>
  );
}
