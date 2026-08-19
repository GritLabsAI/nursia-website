import Link from "next/link";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  Byline,
  CtaBand,
  FaqList,
  FaqSchema,
  InlineCta,
  OnThisPage,
  PrimaryCta,
  Section,
  SectionHead,
} from "@/components/Blocks";
import { QuestionSet } from "@/components/QuestionSet";
import { StickyCta } from "@/components/StickyCta";
import { GUIDES, HUB_FAQ, QUESTIONS, SITE, TOPICS } from "@/lib/content";

/* Title under 60 chars, description under 155 — this is the page the whole
   site links to, so it is the one that gets finalised first. */
export const metadata: Metadata = {
  title: { absolute: "Free NCLEX Practice Questions (2026) | Nursia" },
  description:
    "10 free NCLEX-RN practice questions with full rationales, no account needed. Written and reviewed by nurses, mapped to every NCSBN test-plan category.",
  alternates: { canonical: "/nclex-practice-questions" },
};

const TRAIL = [
  { label: "Home", href: "/" },
  { label: "NCLEX practice questions" },
];

const SET = [
  "safe-011",
  "pharm-104",
  "medsurg-088",
  "psych-030",
  "risk-066",
  "basic-055",
  "sata-101",
  "health-023",
  "pharm-212",
  "safe-047",
].map((k) => QUESTIONS[k]);

const TYPES = [
  {
    name: "Select all that apply",
    body: "Five or six options, any number correct, and no partial credit on the classic format. Judge each option on its own against the pathophysiology — never against the other options.",
  },
  {
    name: "Matrix",
    body: "A grid of findings to classify as expected, unexpected, or unrelated. Partial credit applies, with a penalty for wrong selections, so answer only the cells you can defend.",
  },
  {
    name: "Bowtie",
    body: "One condition in the centre, two actions on the left, two parameters to monitor on the right. It is a whole case compressed into a single scored item.",
  },
  {
    name: "Drag and drop",
    body: "Ordered response items — usually a procedure sequence or a prioritization. Build the list from the safety step backwards and it resolves faster.",
  },
];

export default function HubPage() {
  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />
      <FaqSchema items={HUB_FAQ} />
      <StickyCta />

      <Section className="pt-10 pb-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0">
            <Breadcrumbs trail={TRAIL} />

            <h1 className="max-w-3xl text-[2.25rem] leading-[1.04] sm:text-[3rem]">
              Free NCLEX practice questions
            </h1>

            {/* First 60 words answer the query outright, before any pitch. */}
            <p className="mt-6 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
              Ten free NCLEX-RN practice questions are below, playable on this page with no
              account. Each one is written by a registered nurse, mapped to an NCSBN test-plan
              category, and followed by a rationale that explains why the other options fail. The
              set covers safe and effective care, pharmacology, physiological adaptation, and
              psychosocial integrity — the four heaviest categories on the exam.
            </p>

            <div className="mt-6">
              <Byline updated={SITE.updated} />
            </div>

            <PrimaryCta className="mt-7" />

            {/* --------------------------------------- section 1: the set */}
            <div id="free-questions" className="mt-16 scroll-mt-24">
              <SectionHead
                eyebrow="Section 1"
                title="10 real questions, answerable right here"
                note="This is the whole product, ungated. Answer, check, read the rationale, move on."
              />
              <div className="mt-8">
                <QuestionSet
                  questions={SET}
                  label="Free set · mixed categories"
                  gate={{
                    eyebrow: "End of the free set",
                    headline: "Keep going",
                    body: "A free account adds 50 more questions and tells you which category is costing you the most marks. Email and password, no card.",
                    cta: { label: "Start free →", href: "/signup" },
                    exits: [
                      { label: "See pricing", href: "/pricing" },
                      { label: "Practise a single topic", href: "#by-topic" },
                    ],
                  }}
                />
              </div>
            </div>

            {/* ------------------------------------- section 2: by topic */}
            <div id="by-topic" className="mt-20 scroll-mt-24">
              <SectionHead
                eyebrow="Section 2"
                title="Practice questions by topic"
                note="Eight sets, each weighted the way the NCSBN test plan weights that category. Five questions on every page are free."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {TOPICS.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/nclex-practice-questions/${t.slug}`}
                    className="cell flex items-center gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                        {t.name}
                      </p>
                      <p className="mt-1 text-[0.8125rem] leading-snug text-ink-2">{t.blurb}</p>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-[0.8125rem] text-teal">
                      {t.count} q →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA slot 3 — curiosity, not a sales pitch */}
            <InlineCta
              prompt="Want to know where you actually stand? Two questions and we will name your weakest category."
              action="Check my level →"
            />

            {/* --------------------------------- section 3: question types */}
            <div id="question-types" className="mt-4 scroll-mt-24">
              <SectionHead
                eyebrow="Section 3"
                title="The question types, explained"
                note="Since April 2023 the exam mixes Next Generation formats in with standard single-answer items. The reasoning is the same; the interface is not."
              />
              <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {TYPES.map((t) => (
                  <div key={t.name} className="border-t border-rule pt-4">
                    <dt className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                      {t.name}
                    </dt>
                    <dd className="mt-2 font-body text-[0.9375rem] leading-[1.65] text-ink-2">
                      {t.body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ------------------------------------ section 4: how to use */}
            <div id="how-to-study" className="mt-20 scroll-mt-24">
              <SectionHead
                eyebrow="Section 4"
                title="How to use practice questions properly"
              />
              <div className="prose-ns mt-6 max-w-2xl">
                <p>
                  The gap between candidates who pass on the first attempt and candidates who
                  repeat is mostly a gap in method, not hours. Practice questions only work if the
                  rationale is the point and the score is a by-product.
                </p>
                <ul>
                  <li>
                    <strong>Read every rationale, including the ones you got right.</strong> A
                    lucky correct answer is a wrong answer you have not met yet.
                  </li>
                  <li>
                    <strong>Around 75 questions a day, for four to six weeks.</strong> Two hundred
                    that you do not review teaches you almost nothing.
                  </li>
                  <li>
                    <strong>Mix categories after week two.</strong> Blocked practice inflates your
                    score; the real exam never tells you which category you are in.
                  </li>
                  <li>
                    <strong>Track why you missed it, not that you missed it.</strong> Misread the
                    stem, did not know the fact, or knew it and ranked it wrong — three different
                    problems with three different fixes.
                  </li>
                </ul>
                <p>
                  Our{" "}
                  <Link href="/guides/four-week-study-plan">4-week study plan</Link> lays this out
                  day by day, and{" "}
                  <Link href="/guides/how-to-answer-sata">how to answer SATA</Link> covers the
                  format that costs most candidates the most marks.
                </p>
              </div>
            </div>

            {/* -------------------------------------------------------- faq */}
            <div id="faq" className="mt-20 scroll-mt-24">
              <SectionHead eyebrow="FAQ" title="NCLEX practice question FAQ" />
              <div className="mt-7 max-w-2xl">
                <FaqList items={HUB_FAQ} />
              </div>
            </div>

            {/* ---------------------------------------------------- related */}
            <div className="mt-16 border-t border-rule pt-5">
              <p className="eyebrow">Related</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {["how-hard-is-the-nclex", "four-week-study-plan"].map((slug) => {
                  const g = GUIDES.find((x) => x.slug === slug)!;
                  return (
                    <li key={slug}>
                      <Link href={`/guides/${slug}`} className="cell h-full">
                        <p className="eyebrow">Guide · {g.minutes} min</p>
                        <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                          {g.title}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link href="/nclex-practice-questions/pharmacology" className="cell h-full">
                    <p className="eyebrow">Topic · 210 q</p>
                    <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      Pharmacology questions
                    </p>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* ------------------------------------------------ sticky rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <OnThisPage
                items={[
                  { label: "10 free questions", href: "#free-questions" },
                  { label: "By topic", href: "#by-topic" },
                  { label: "Question types", href: "#question-types" },
                  { label: "How to study", href: "#how-to-study" },
                  { label: "FAQ", href: "#faq" },
                ]}
              />
              <div className="mt-8 border-t border-rule pt-4">
                <p className="eyebrow">Free tier</p>
                <p className="mt-3 font-mono text-[1.5rem] leading-none text-ink">50</p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-ink-2">
                  more questions with a free account. No card.
                </p>
                <Link href="/signup" className="btn btn-primary mt-4 w-full !py-2.5 !text-sm">
                  Start free →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}
