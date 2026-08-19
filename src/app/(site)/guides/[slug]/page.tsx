import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  Byline,
  CtaBand,
  InlineCta,
  OnThisPage,
  Section,
} from "@/components/Blocks";
import { QuestionSet } from "@/components/QuestionSet";
import { StickyCta } from "@/components/StickyCta";
import { GUIDES, QUESTIONS, guideBySlug, topicBySlug } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: { absolute: `${g.title} | Nursia` },
    description: g.shortAnswer.slice(0, 155),
    alternates: { canonical: `/guides/${g.slug}` },
  };
}

const anchor = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();

  const trail = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: g.title },
  ];
  const topic = topicBySlug(g.topic)!;
  const next = g.readNext.map((s) => guideBySlug(s)!).filter(Boolean);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.h1,
    description: g.shortAnswer,
    author: { "@type": "Person", name: "Dana Whitfield, RN, MSN" },
    publisher: { "@type": "Organization", name: "Nursia" },
    dateModified: "2026-08-01",
  };

  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <StickyCta />

      <Section className="pt-10 pb-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
          <article className="min-w-0 max-w-[42rem]">
            <Breadcrumbs trail={trail} />

            <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.625rem]">{g.h1}</h1>

            <div className="mt-5">
              <Byline updated={g.updated} minutes={g.minutes} />
            </div>

            {/* Short answer — the first 60 words, written for the snippet */}
            <div className="mt-8 border-l-2 border-teal pl-5">
              <p className="eyebrow">Short answer</p>
              <p className="mt-2.5 font-body text-[1.0625rem] leading-[1.68] text-ink sm:text-[1.125rem]">
                {g.shortAnswer}
              </p>
            </div>

            <div className="prose-ns mt-10">
              {g.sections.map((s, i) => (
                <div key={s.h2}>
                  <h2 id={anchor(s.h2)} className="scroll-mt-24">
                    {s.h2}
                  </h2>
                  {s.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}

                  {/* CTA slot 3 sits after section two — the highest-converting
                      position on an editorial page, and it converts on curiosity */}
                  {i === 1 && (
                    <div className="not-prose">
                      <InlineCta
                        prompt="Reading about it will not tell you where you stand. Two questions will."
                        action="Try 2 →"
                      />
                    </div>
                  )}
                </div>
              ))}

              <p>
                Whatever you take from this, the next step is the same: answer questions and read
                the rationales. Our{" "}
                <Link href={`/nclex-practice-questions/${topic.slug}`}>
                  {topic.name.toLowerCase()} practice questions
                </Link>{" "}
                are the closest set to what this guide covers, there are ten more on the{" "}
                <Link href="/nclex-practice-questions">practice questions hub</Link>, and the{" "}
                <Link href="/pricing">pricing page</Link> spells out what the free tier includes.
              </p>
            </div>

            {/* one question, in the article, because the argument of this whole
                site is that a question beats a paragraph */}
            <div className="mt-14 border-t border-rule pt-8">
              <p className="eyebrow">One question from the {topic.name.toLowerCase()} set</p>
              <div className="mt-5">
                <QuestionSet questions={[QUESTIONS[topic.questions[0]]]} />
              </div>
            </div>

            <div className="mt-14 border-t border-rule pt-5">
              <p className="eyebrow">Read next</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {next.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/guides/${n.slug}`} className="cell h-full">
                      <p className="eyebrow">{n.minutes} min</p>
                      <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                        {n.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <OnThisPage
                items={g.sections.map((s) => ({ label: s.h2, href: `#${anchor(s.h2)}` }))}
              />
              <div className="mt-8 border-t border-rule pt-4">
                <p className="eyebrow">Practise this</p>
                <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">
                  {topic.count} {topic.name.toLowerCase()} questions, five of them free.
                </p>
                <Link
                  href={`/nclex-practice-questions/${topic.slug}`}
                  className="btn btn-ghost mt-4 w-full !py-2.5 !text-sm"
                >
                  Open the set →
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
