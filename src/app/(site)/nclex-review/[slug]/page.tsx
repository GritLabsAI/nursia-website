import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  Byline,
  CtaBand,
  FaqList,
  FaqSchema,
  OnThisPage,
  Section,
} from "@/components/Blocks";
import { GuideView } from "@/components/GuideView";
import { PortableBody } from "@/components/PortableBody";
import { QuestionSet } from "@/components/QuestionSet";
import { ResourceGate } from "@/components/ResourceGate";
import { QUESTIONS, SITE, playableCount, topicBySlug } from "@/lib/content";
import { buildClient, sanityFetch, SEO_PAGE_TAGS, tags } from "@/sanity/client";
import {
  SEO_PAGE_BY_SLUG_QUERY,
  SEO_PAGE_SEO_QUERY,
  SEO_PAGE_SLUGS_QUERY,
} from "@/sanity/queries";
import type {
  SEO_PAGE_BY_SLUG_QUERY_RESULT,
  SEO_PAGE_SEO_QUERY_RESULT,
} from "@/sanity.types";

/**
 * One review page: a single exam subject, answered at revision depth.
 *
 * This is the guide template's twin, deliberately. The conversion architecture
 * is identical down to the component — the same `ResourceGate` in the same two
 * placements under the same experiment, the same practice-set rail, the same
 * closing band — because the offer is the thing that has been tested and a
 * second, subtly different funnel would make both harder to read.
 *
 * What differs is the body, and it differs because the reader differs. Somebody
 * on a guide is deciding something: when to book, what a result means. Somebody
 * here is revising, three days out, with a list. So the page leads with the
 * claims rather than the argument — `keyPoints` above the fold, `examTip` where
 * the exam's phrasing and the ward's practice come apart — and the prose comes
 * after, for the reader who needs the reasoning rather than the recall.
 */

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  /* Straight past the CDN: this runs once at build time, and a cached slug list
     is how a page published ninety seconds ago misses the build entirely. */
  const slugs = await buildClient.fetch<string[]>(SEO_PAGE_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await sanityFetch<SEO_PAGE_SEO_QUERY_RESULT>(SEO_PAGE_SEO_QUERY, {
    params: { slug },
    tags: [tags.seoPage(slug), tags.authors],
  });
  if (!p) return {};

  /* Cut on a sentence, not mid-word at 155 — a truncated snippet reads as
     scraped, and assistants quote descriptions verbatim. */
  const fallback =
    p.shortAnswer.length <= 158
      ? p.shortAnswer
      : `${p.shortAnswer.slice(0, 155).replace(/[\s,;:]+\S*$/, "")}…`;
  const description = p.seo?.description || fallback;

  return {
    title: { absolute: `${p.seo?.title || p.title} | Nursia` },
    description,
    alternates: { canonical: `/nclex-review/${p.slug}` },
    ...(p.seo?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: p.h1,
      description,
      url: `/nclex-review/${p.slug}`,
      publishedTime: `${p.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${p.updatedAt}T00:00:00.000Z`,
      authors: [`${p.authorName}, ${p.authorHonorific}`],
    },
    twitter: { card: "summary_large_image", title: p.h1, description },
  };
}

const anchor = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** "September 2026" from an ISO date, for the visible byline. */
const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** What the page promises, in the reader's words rather than the schema's. */
const KIND_LABEL: Record<string, string> = {
  practice: "Practice questions",
  review: "Subject review",
  clinical: "Nursing care",
  medication: "Medication review",
  strategy: "Answering strategy",
};

export default async function ReviewPage({ params }: Params) {
  const { slug } = await params;
  const p = await sanityFetch<SEO_PAGE_BY_SLUG_QUERY_RESULT>(SEO_PAGE_BY_SLUG_QUERY, {
    params: { slug },
    tags: [tags.seoPage(slug), ...SEO_PAGE_TAGS],
  });
  if (!p) notFound();

  const trail = [
    { label: "Home", href: "/" },
    { label: "NCLEX review", href: "/nclex-review" },
    { label: p.title },
  ];

  /* The questions stay in the repo, and this is the seam. Sanity owns the
     editorial wrapper around a topic; the items themselves are versioned,
     reviewed in pull requests, and rendered into the static HTML — which is the
     whole reason these pages rank. The slug is the contract between them. */
  const localTopic = p.topic?.slug ? topicBySlug(p.topic.slug) : undefined;
  const sample = localTopic?.questions?.[0]
    ? QUESTIONS[localTopic.questions[0]]
    : null;
  const topicCount = localTopic
    ? localTopic.count ?? playableCount(localTopic.slug)
    : 0;

  const url = `${SITE.url}/nclex-review/${p.slug}`;
  const sections = p.sections ?? [];
  const keyPoints = (p.keyPoints ?? []).filter(Boolean) as string[];
  const faqs = (p.faqs ?? []).filter((f) => f.q && f.a) as { q: string; a: string }[];

  /* Word count from the rendered text rather than a stored number, so it cannot
     drift away from the page it describes after an edit. */
  const words =
    countWords(p.shortAnswer) +
    keyPoints.reduce((n, k) => n + countWords(k), 0) +
    countWords(p.examTip) +
    sections.reduce((n, s) => n + countBlocks(s.body), 0) +
    faqs.reduce((n, f) => n + countWords(`${f.q} ${f.a}`), 0);

  /* One Article node, fully described. `about`/`mentions` tie the page to
     entities an answer engine can resolve, `author` carries the credential that
     makes health content quotable, and `wordCount`/`timeRequired` stop it being
     read as a stub. */
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: p.h1,
    name: p.title,
    description: p.shortAnswer,
    abstract: p.shortAnswer,
    articleSection: sections.map((s) => s.h2),
    inLanguage: "en-US",
    isAccessibleForFree: true,
    wordCount: words,
    timeRequired: `PT${p.minutes}M`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Person",
      name: p.author?.name,
      honorificSuffix: p.author?.honorific,
      jobTitle: p.author?.jobTitle,
      knowsAbout: p.author?.knowsAbout ?? [],
      ...(p.author?.sameAs?.length ? { sameAs: p.author.sameAs } : {}),
      worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url },
    },
    ...(p.reviewedBy
      ? {
          reviewedBy: {
            "@type": "Person",
            name: p.reviewedBy.name,
            honorificSuffix: p.reviewedBy.honorific,
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      "@id": `${SITE.url}#organization`,
      name: SITE.name,
      url: SITE.url,
    },
    datePublished: p.publishedAt,
    dateModified: p.updatedAt,
    about: { "@type": "Thing", name: "NCLEX-RN", sameAs: "https://www.nclex.com/" },
    ...(p.examCategory
      ? { mentions: [{ "@type": "Thing", name: p.examCategory }] }
      : {}),
    isPartOf: {
      "@type": "CollectionPage",
      name: "NCLEX Review",
      "@id": `${SITE.url}/nclex-review`,
    },
  };

  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqs.length > 0 && <FaqSchema items={faqs} />}

      <GuideView
        guide={p.slug!}
        cluster={p.cluster ?? undefined}
        topic={p.topic?.slug ?? undefined}
        resource={p.leadMagnet?.slug ?? undefined}
        experiment={p.experiment}
        library="review"
      />

      <Section className="pt-10 pb-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
          <article className="min-w-0 max-w-[42rem]">
            <Breadcrumbs trail={trail} />

            <p className="eyebrow mt-6">
              {KIND_LABEL[p.kind ?? ""] ?? "Review"} · {p.examCategory}
            </p>
            <h1 className="mt-2 text-[2.125rem] leading-[1.05] sm:text-[2.625rem]">{p.h1}</h1>

            <div className="mt-5">
              <Byline
                by={`${p.author?.name}, ${p.author?.honorific}`}
                updated={monthYear(p.updatedAt!)}
                minutes={p.minutes ?? undefined}
              />
            </div>

            {/* Short answer — the first 60 words, written for the snippet */}
            <div className="mt-8 border-l-2 border-teal pl-5">
              <p className="eyebrow">Short answer</p>
              <p className="mt-2.5 font-body text-[1.0625rem] leading-[1.68] text-ink sm:text-[1.125rem]">
                {p.shortAnswer}
              </p>
            </div>

            {/* The claims, above the argument. A revising reader takes these and
                leaves; the prose below is for the one who needs the reasoning. */}
            {keyPoints.length > 0 && (
              <div className="mt-10 cell">
                <p className="eyebrow">What to take away</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {keyPoints.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 font-body text-[0.9375rem] leading-[1.6] text-ink sm:text-base"
                    >
                      <span aria-hidden className="mt-[0.55em] h-[3px] w-3 shrink-0 bg-teal" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="prose-ns mt-10">
              {sections.map((s, i) => (
                <div key={s._key}>
                  <h2 id={anchor(s.h2!)} className="scroll-mt-24">
                    {s.h2}
                  </h2>
                  <PortableBody value={s.body} />

                  {/* The offer, mid-article. Whether it renders here, at the end,
                      or in both places is the gate_placement experiment; the
                      component decides and records which it showed. */}
                  {i === 1 && p.leadMagnet && (
                    <ResourceGate
                      resource={p.leadMagnet}
                      experiment={p.experiment}
                      guideSlug={p.slug!}
                      at="mid"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Where the exam and the ward disagree. The page's reason to exist
                over a textbook chapter, so it is given its own frame. */}
            {p.examTip && (
              <div className="mt-12 border-l-2 border-ink bg-paper-2 py-5 pl-5 pr-4">
                <p className="eyebrow">On the exam, not on the ward</p>
                <p className="mt-2.5 font-body text-[0.9375rem] leading-[1.65] text-ink sm:text-base">
                  {p.examTip}
                </p>
              </div>
            )}

            {/* One question, in the page, because the argument of this whole site
                is that a question beats a paragraph. */}
            {sample && localTopic && (
              <div className="mt-14 border-t border-rule pt-8">
                <p className="eyebrow">
                  One question from the {localTopic.name.toLowerCase()} set
                </p>
                <div className="mt-5">
                  <QuestionSet questions={[sample]} />
                </div>
              </div>
            )}

            {/* The long-tail phrasings the body cannot answer without turning
                into a list. Visible copy first, schema second — never the other
                way round. */}
            {faqs.length > 0 && (
              <div className="mt-14 border-t border-rule pt-8">
                <h2 id="faq" className="scroll-mt-24 text-[1.5rem] sm:text-[1.75rem]">
                  Common questions
                </h2>
                <div className="mt-5">
                  <FaqList items={faqs} />
                </div>
              </div>
            )}

            {p.leadMagnet && (
              <ResourceGate
                resource={p.leadMagnet}
                experiment={p.experiment}
                guideSlug={p.slug!}
                at="end"
              />
            )}

            {/* Out into the hand-written library. These links are the reason a
                hundred new pages strengthen the cluster that already ranks
                instead of forming an island next to it. */}
            {p.relatedGuides && p.relatedGuides.length > 0 && (
              <div className="mt-14 border-t border-rule pt-5">
                <p className="eyebrow">From the guides</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {p.relatedGuides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="font-body text-[0.9375rem] text-ink underline decoration-rule underline-offset-4 hover:text-teal"
                      >
                        {g.title}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-muted">
                        {g.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.readNext && p.readNext.length > 0 && (
              <div className="mt-10 border-t border-rule pt-5">
                <p className="eyebrow">Revise next</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {p.readNext.map((n) => (
                    <li key={n.slug}>
                      <Link href={`/nclex-review/${n.slug}`} className="cell h-full">
                        <p className="eyebrow">{n.minutes} min</p>
                        <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                          {n.title}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <OnThisPage
                items={[
                  ...sections.map((s) => ({ label: s.h2!, href: `#${anchor(s.h2!)}` })),
                  ...(faqs.length > 0
                    ? [{ label: "Common questions", href: "#faq" }]
                    : []),
                ]}
              />
              {localTopic && (
                <div className="mt-8 border-t border-rule pt-4">
                  <p className="eyebrow">Practise this</p>
                  <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">
                    {topicCount} {localTopic.name.toLowerCase()} questions, five of them free.
                  </p>
                  <Link
                    href={`/nclex-practice-questions/${localTopic.slug}`}
                    className="btn btn-ghost mt-4 w-full !py-2.5 !text-sm"
                  >
                    Open the set →
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}

/* --------------------------------------------------------------- counting */

function countWords(text: string | null | undefined): number {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

/** Words inside Portable Text, for the schema's wordCount. */
function countBlocks(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 0;
  let n = 0;
  for (const block of blocks) {
    const children = (block as { children?: { text?: string }[] }).children;
    if (!Array.isArray(children)) continue;
    for (const child of children) n += countWords(child.text);
  }
  return n;
}
