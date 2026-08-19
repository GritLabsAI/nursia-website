import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  CtaBand,
  Section,
  SectionHead,
} from "@/components/Blocks";
import { REVIEWERS } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "About Nursia — who writes the questions" },
  description:
    "Why we built Nursia, who writes and reviews every NCLEX question, and the four-step process each item goes through before it goes live.",
  alternates: { canonical: "/about" },
};

const TRAIL = [{ label: "Home", href: "/" }, { label: "About" }];

const PROCESS = [
  {
    step: "Map to the test plan",
    body: "Every item starts as a cell in the NCSBN blueprint — category, subtopic, and cognitive level — so the bank stays weighted the way the exam is weighted rather than the way we find it easy to write.",
  },
  {
    step: "An RN drafts it",
    body: "A practising nurse writes the stem, the options, and the rationale together. If the rationale cannot explain why each distractor fails, the item is not finished.",
  },
  {
    step: "Two peers review",
    body: "A clinical reviewer checks the medicine, a test-plan reviewer checks the mapping and the cognitive level. Both have to sign off, and either can send it back.",
  },
  {
    step: "Revise on the data",
    body: "Once live, we watch how the item performs. Anything almost everyone gets right, or that splits evenly between two options, gets rewritten or pulled.",
  },
];

export default function AboutPage() {
  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />

      <Section className="pt-10 pb-14">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs trail={TRAIL} />
          <h1 className="text-[2.25rem] leading-[1.04] sm:text-[3rem]">Why we built this</h1>

          <div className="prose-ns mt-8">
            <p>
              I sat the NCLEX in 2019 and spent the six weeks before it paying for a question bank
              that would not tell me who had written its questions. Half the rationales were a
              single sentence restating the correct answer. I passed, and I stayed annoyed about
              it, because the thing I actually needed — someone explaining why the other three
              options were wrong — was the one thing nobody was selling.
            </p>
            <p>
              Nursia is the version of that product I wanted. Every question is written by a
              registered nurse, reviewed by two more, and mapped to a category on the NCSBN test
              plan before it goes anywhere near the site. Every rationale explains the distractors,
              not just the key. The names of the people who write and review them are on this page,
              with their credentials, because if we are asking you to trust an unknown brand with
              six weeks of your life, the least we can do is tell you who we are.
            </p>
            <p>
              We are early. There are 1,200 questions where there should eventually be three
              thousand, the case studies are 40 of a planned 90, and we have no pass-rate statistic
              to show you because we have not been running long enough for one to mean anything.
              You will not find a testimonial wall here for the same reason. What you will find is
              the product, ungated, on almost every page — answer a few questions and decide for
              yourself.
            </p>
            <p>
              <strong>— Dana Whitfield, RN, MSN</strong>
              <br />
              Founder
            </p>
          </div>

          <div id="reviewers" className="mt-16 scroll-mt-24">
            <SectionHead
              eyebrow="The team"
              title="Who writes the questions"
              note="Three people. All practising or recently practising, all named, all reachable."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {REVIEWERS.map((r) => (
                <div key={r.name} className="cell">
                  <div
                    className="mb-4 grid h-24 place-items-center rounded-sm border border-rule bg-paper-2 font-mono text-[1.25rem] text-muted"
                    aria-hidden
                  >
                    {r.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <p className="font-display text-[1rem] font-bold tracking-[-0.02em] text-ink">
                    {r.name}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-teal">{r.credentials}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">{r.role}</p>
                  <p className="mt-3 text-[0.8125rem] leading-snug text-ink-2">{r.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <SectionHead
              eyebrow="Process"
              title="How we write a question"
              note="Four steps, in order. Nobody else in this category publishes their process, which is odd, because it is free credibility and it is true."
            />
            <ol className="mt-8 flex flex-col">
              {PROCESS.map((p, i) => (
                <li key={p.step} className="flex gap-6 border-t border-rule py-5">
                  <span className="w-8 shrink-0 font-mono text-[0.9375rem] text-teal">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                      {p.step}
                    </p>
                    <p className="mt-2 font-body text-[0.9375rem] leading-[1.65] text-ink-2">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <CtaBand
        heading="Judge us on the questions."
        sub="That is the whole argument on this page, so here is the only fair test of it: 50 free questions, no card."
      />
    </>
  );
}
