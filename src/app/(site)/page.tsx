import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, Fact, FaqList, FaqSchema, Section, SectionHead } from "@/components/Blocks";
import { QuestionSet } from "@/components/QuestionSet";
import { HOME_FAQ, QUESTIONS, REVIEWERS, SITE, TOPICS } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "Nursia — NCLEX practice questions written by nurses" },
  description:
    "Answer a real NCLEX-RN question right now, no account. 1,200 questions across the whole NCSBN test plan, every rationale written and reviewed by practising nurses.",
  alternates: { canonical: "/" },
};

/* The hero carries the whole argument: at stage 0 the product is the only
   proof available, so the first thing on the page is a real question. */
const HERO_SET = [QUESTIONS["pharm-104"], QUESTIONS["safe-011"], QUESTIONS["psych-030"]];

export default function HomePage() {
  return (
    <>
      <FaqSchema items={HOME_FAQ} />

      {/* ---------------------------------------------------------- hero */}
      <Section className="pt-14 pb-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="lg:pt-4">
            <p className="eyebrow">NCLEX-RN · 1,200 questions</p>
            <h1 className="mt-5 text-[2.5rem] leading-[1.02] sm:text-[3.25rem] lg:text-[3.5rem]">
              Answer one real NCLEX question.{" "}
              <span className="mark">Right now.</span>
            </h1>
            <p className="mt-6 max-w-md font-body text-[1.0625rem] leading-[1.65] text-ink-2 sm:text-[1.125rem]">
              No hero image, no pass-rate banner, no testimonials we have not earned yet. The
              question on the right is the pitch. If it is a good item, you will know in about
              forty seconds.
            </p>

            <ul className="mt-8 flex flex-col gap-3 border-t border-rule pt-6">
              {[
                ["1,200", "questions across all eight test-plan categories"],
                ["Next Gen", "case studies, matrix, bowtie, and SATA"],
                ["3 RNs", "write and review every single item"],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-4 text-[0.9375rem]">
                  <span className="w-[4.5rem] shrink-0 font-mono text-[0.8125rem] text-ink">
                    {k}
                  </span>
                  <span className="text-ink-2">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <QuestionSet
              questions={HERO_SET}
              label="Sample · no account needed"
              gate={{
                eyebrow: "That is the whole product",
                headline: "Keep going",
                body: "A free account adds 50 more questions, every rationale, and a ranked list of the topics costing you marks. Email and password — no card, ever.",
                cta: { label: "Sign up free →", href: "/signup" },
                exits: [
                  { label: "10 more questions, still no account", href: "/nclex-practice-questions" },
                  { label: "See pricing", href: "/pricing" },
                ],
              }}
            />
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ the coverage map */}
      <Section className="py-16">
        <SectionHead
          eyebrow="Coverage"
          title="Every topic on the NCSBN test plan. Here is the whole map."
          note="Radical transparency instead of praise. Each cell is a real question count and a real slice of the exam — including the one we have not finished yet."
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((t) => (
            <Link key={t.slug} href={`/nclex-practice-questions/${t.slug}`} className="cell group">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                  {t.name}
                </span>
                <span className="font-mono text-[0.9375rem] text-teal">{t.count}</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted">{t.share}</p>
              <p className="mt-3 text-[0.8125rem] leading-snug text-ink-2">{t.blurb}</p>
            </Link>
          ))}
          <div className="cell border-dashed">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-muted">
                Unfolding case studies
              </span>
              <span className="font-mono text-[0.9375rem] text-muted">40</span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted">In progress · 40 of a planned 90</p>
            <p className="mt-3 text-[0.8125rem] leading-snug text-muted">
              Admitting what is not built yet is the only credibility we can offer this early.
            </p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------- what is inside */}
      <Section className="py-16">
        <SectionHead
          eyebrow="What is inside"
          title="Facts, not praise."
          note="These are the numbers we can be held to. They replace the pass-rate wall every competitor leads with."
        />
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Fact value="1,200" label="Questions" note="Every one mapped to a test-plan category" />
          <Fact value="100%" label="Test-plan coverage" note="All eight client-need categories" />
          <Fact
            value="Next Gen"
            label="Case studies and SATA"
            note="Matrix, bowtie, and unfolding cases"
          />
          <Fact value="3 RNs" label="On every rationale" note="One writes, two review, all named" />
        </div>
      </Section>

      {/* --------------------------------------------------- who writes them */}
      <Section className="py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <SectionHead
            eyebrow="Accountability"
            title="Who writes the questions."
            note="Named people with credentials you can check. Nobody else in NCLEX prep publishes this, and it costs us nothing to be honest about."
          />
          <div className="grid gap-4 sm:grid-cols-3 lg:pt-8">
            {REVIEWERS.map((r) => (
              <div key={r.name} className="border-t border-rule pt-4">
                <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                  {r.name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">{r.credentials}</p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-ink-2">{r.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8">
          <Link
            href="/about"
            className="font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
          >
            → How we write and review a question, in four steps
          </Link>
        </p>
      </Section>

      {/* ------------------------------------------------------------ price */}
      <Section className="py-16">
        <SectionHead
          eyebrow="Pricing"
          title="One plan, and a free tier that keeps working."
          note="No third tier and no annual toggle. Every extra choice costs conversions we cannot afford to lose yet."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-rule bg-white p-7">
            <p className="eyebrow">Free</p>
            <p className="mt-3 font-mono text-[2.25rem] leading-none tracking-[-0.03em] text-ink">
              $0
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-[0.9375rem] text-ink-2">
              {["50 questions", "Full rationales", "Your weak topics", "No card, ever"].map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="font-mono text-teal">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn btn-ghost mt-7 w-full">
              Sign up free
            </Link>
          </div>
          <div className="rounded-sm border-2 border-ink bg-white p-7">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow !text-ink">Full access</p>
              <span className="mark font-mono text-[11px] font-medium tracking-[0.06em] uppercase">
                Most pick this
              </span>
            </div>
            <p className="mt-3 font-mono text-[2.25rem] leading-none tracking-[-0.03em] text-ink">
              ${SITE.price}
              <span className="text-base text-muted"> /mo</span>
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-[0.9375rem] text-ink-2">
              {[
                "All 1,200 questions",
                "Next Gen case studies",
                "Readiness exams",
                "A study plan built from your results",
                "14-day refund",
              ].map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="font-mono text-teal">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn btn-primary mt-7 w-full">
              Sign up free →
            </Link>
            <p className="mt-3 text-center font-mono text-[11px] text-muted">
              Start on the free tier — you are never asked for a card to begin
            </p>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------------- faq */}
      <Section className="py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
          <SectionHead eyebrow="Questions about us" title="Five that come up most." />
          <FaqList items={HOME_FAQ} />
        </div>
      </Section>

      <CtaBand
        heading="Judge us on the questions."
        sub="50 of them, free, no card. If the items are not good you will know inside ten minutes — which is exactly the deal we want to offer."
      />
    </>
  );
}
