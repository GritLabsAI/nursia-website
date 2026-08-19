import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  Byline,
  CtaBand,
  InlineCta,
  PrimaryCta,
  Section,
  SectionHead,
} from "@/components/Blocks";
import { QuestionSet } from "@/components/QuestionSet";
import { StickyCta } from "@/components/StickyCta";
import { QUESTIONS, SITE, TOPICS, guideBySlug, topicBySlug } from "@/lib/content";

type Params = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic } = await params;
  const t = topicBySlug(topic);
  if (!t) return {};
  return {
    title: { absolute: `${t.name} NCLEX Practice Questions | Nursia` },
    description:
      `${t.count} NCLEX ${t.name.toLowerCase()} practice questions with rationales, five of them free with no account. ${t.share}, written and reviewed by nurses.`.slice(
        0,
        155,
      ),
    alternates: { canonical: `/nclex-practice-questions/${t.slug}` },
  };
}

export default async function TopicPage({ params }: Params) {
  const { topic } = await params;
  const t = topicBySlug(topic);
  if (!t) notFound();

  const trail = [
    { label: "Home", href: "/" },
    { label: "Practice questions", href: "/nclex-practice-questions" },
    { label: t.name },
  ];
  const questions = t.questions.map((k) => QUESTIONS[k]);
  const siblings = t.siblings.map((s) => topicBySlug(s)!);
  const guides = t.guides.map((g) => guideBySlug(g)!);

  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <StickyCta />

      <Section className="pt-10 pb-14">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs trail={trail} />

          <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.75rem]">{t.h1}</h1>

          {/* the three facts that qualify this page, in mono because each is checkable */}
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-rule py-4">
            {[
              [`${t.count}`, "questions"],
              [t.share.replace(" of the exam", ""), "of the exam"],
              [SITE.updated, "last updated"],
            ].map(([v, k]) => (
              <div key={k} className="flex items-baseline gap-2">
                <dt className="sr-only">{k}</dt>
                <dd className="font-mono text-[0.9375rem] text-ink">{v}</dd>
                <span className="font-mono text-[11px] text-muted">{k}</span>
              </div>
            ))}
          </dl>

          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.125rem]">
            {t.intro}
          </p>

          <div className="mt-6">
            <Byline updated={SITE.updated} />
          </div>

          <PrimaryCta className="mt-7" />

          {/* ------------------------------------------ 5 free questions */}
          <div className="mt-14">
            <SectionHead
              eyebrow={`${t.category}`}
              title={`5 free ${t.name.toLowerCase()} questions`}
              note="Playable here, no account. Rationales expand in place."
            />
            <div className="mt-8">
              <QuestionSet
                questions={questions}
                label={`${t.name} · free set`}
                gate={{
                  eyebrow: "End of the free set",
                  headline: "Keep going",
                  body: `A free account opens 50 questions across every category, including more ${t.name.toLowerCase()}. No card.`,
                  cta: { label: "Sign up free →", href: "/signup" },
                  exits: [
                    { label: "All 8 topics", href: "/nclex-practice-questions" },
                    { label: "See pricing", href: "/pricing" },
                  ],
                }}
              />
            </div>
          </div>

          {/* ----------------------------------------- subtopic breakdown */}
          <div className="mt-16">
            <SectionHead
              eyebrow="Breakdown"
              title={`What is tested in ${t.name.toLowerCase()}`}
              note="How the questions in this set are distributed, so you can see what you are buying before you buy it."
            />
            <table className="mt-7 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink">
                  <th className="eyebrow py-2.5 font-normal">Subtopic</th>
                  <th className="eyebrow py-2.5 text-right font-normal">Questions</th>
                </tr>
              </thead>
              <tbody>
                {t.subtopics.map((s) => (
                  <tr key={s.name} className="border-b border-rule">
                    <td className="py-3 text-[0.9375rem] text-ink-2">{s.name}</td>
                    <td className="py-3 text-right font-mono text-[0.875rem] text-ink">
                      {s.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InlineCta
            prompt={`Weak on ${t.name.toLowerCase()}? Two questions and we will tell you.`}
            action="Check →"
          />

          {/* ------------------------------------------------ related sets */}
          <div className="mt-4 border-t border-rule pt-5">
            <p className="eyebrow">Related question sets</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link href={`/nclex-practice-questions/${s.slug}`} className="cell h-full">
                    <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {s.name}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-teal">{s.count} q →</p>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <Link
                href="/nclex-practice-questions"
                className="font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
              >
                ↑ All eight topics and 10 more free questions
              </Link>
            </p>
          </div>

          {/* ---------------------------------------------------- guides */}
          <div className="mt-12 border-t border-rule pt-5">
            <p className="eyebrow">Guides for this topic</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="cell h-full">
                    <p className="eyebrow">{g.minutes} min read</p>
                    <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {g.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <CtaBand
        heading={`Drill all ${t.count} ${t.name.toLowerCase()} questions.`}
        sub="Start on the free tier: 50 questions across every category, full rationales, no card."
      />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}
