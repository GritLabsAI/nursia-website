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
import { buildClient, sanityFetch, NURSING_PAGE_TAGS, tags } from "@/sanity/client";
import {
  NURSING_PAGE_BY_SLUG_QUERY,
  NURSING_PAGE_SEO_QUERY,
  NURSING_SLUGS_QUERY,
} from "@/sanity/nursing-queries";
import type {
  NURSING_PAGE_BY_SLUG_QUERY_RESULT,
  NURSING_PAGE_SEO_QUERY_RESULT,
} from "@/sanity.types";

/**
 * One nursing library page.
 *
 * The guide template's third sibling, and deliberately the same shape: the same
 * `ResourceGate` under the same experiment, the same practice rail, the same
 * closing band. The offer is the thing that has been tested, and a third subtly
 * different funnel would make all three harder to read.
 *
 * What is different here is the linking, and it is different because of scale.
 * A guide is one of fifty and is found from the navigation. This is one of a
 * thousand and is found from a search result — so the page carries its siblings
 * and its parent guides as rails inside the article rather than as a courtesy
 * in the sidebar. Those rails are the crawl path. A thousand pages that link
 * only upward are a thousand pages a crawler sees once and revisits rarely, and
 * a sitemap is a hint rather than a route.
 */

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerendered, with the webhook in /api/revalidate doing the freshness.
 *
 * An hour is the backstop rather than the mechanism: if the webhook is healthy
 * an edit is live in seconds, and if somebody has broken it the page is at
 * worst an hour stale instead of stale until the next deploy.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  /*
   * Straight past the CDN, and every slug.
   *
   * A thousand pages is a long build, and the temptation is to prerender the
   * top hundred and let the rest render on demand. That would be the wrong
   * saving: `dynamicParams` covers correctness but not the first byte, and the
   * pages it would leave out are the deep, low-volume ones — exactly the pages
   * whose only chance of being indexed is being complete and fast the first
   * time a crawler asks.
   */
  const slugs = await buildClient.fetch<string[]>(NURSING_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await sanityFetch<NURSING_PAGE_SEO_QUERY_RESULT>(NURSING_PAGE_SEO_QUERY, {
    params: { slug },
    tags: [tags.nursingPage(slug), tags.authors],
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
    alternates: { canonical: `/nursing/${p.slug}` },
    ...(p.seo?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: p.h1,
      description,
      url: `/nursing/${p.slug}`,
      publishedTime: `${p.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${p.updatedAt}T00:00:00.000Z`,
      ...(p.authorName
        ? { authors: [`${p.authorName}, ${p.authorHonorific}`] }
        : {}),
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

/** What the page is, in the reader's words rather than the schema's. */
const FAMILY_LABEL: Record<string, string> = {
  clinical: "Nursing care",
  practice: "How to practise",
  faq: "Answered",
  exam: "Exam logistics",
  career: "Licensure and career",
};

export default async function NursingLibraryPage({ params }: Params) {
  const { slug } = await params;
  const p = await sanityFetch<NURSING_PAGE_BY_SLUG_QUERY_RESULT>(
    NURSING_PAGE_BY_SLUG_QUERY,
    { params: { slug }, tags: [tags.nursingPage(slug), ...NURSING_PAGE_TAGS] },
  );
  if (!p) notFound();

  const trail = [
    { label: "Home", href: "/" },
    { label: "Nursing library", href: "/nursing" },
    { label: p.title! },
  ];

  /* The questions stay in the repo, and this is the seam. Sanity owns the
     editorial wrapper around a topic; the items themselves are versioned,
     reviewed in pull requests, and rendered into the static HTML — which is the
     whole reason these pages rank. The slug is the contract between them. */
  const localTopic = p.topic?.slug ? topicBySlug(p.topic.slug) : undefined;
  const sample = localTopic?.questions?.[0] ? QUESTIONS[localTopic.questions[0]] : null;
  const topicCount = localTopic ? localTopic.count ?? playableCount(localTopic.slug) : 0;

  const url = `${SITE.url}/nursing/${p.slug}`;
  const sections = p.sections ?? [];
  const faqs = (p.faqs ?? []).filter((f) => f.q && f.a) as { q: string; a: string }[];
  const readNext = p.readNext ?? [];
  const relatedGuides = p.relatedGuides ?? [];

  /* Word count from the rendered text rather than a stored number, so it cannot
     drift away from the page it describes after an edit. */
  const words =
    countWords(p.shortAnswer) +
    sections.reduce((n, s) => n + countWords(s.h2) + countBlocks(s.body), 0) +
    faqs.reduce((n, f) => n + countWords(`${f.q} ${f.a}`), 0);

  /*
   * One Article node, fully described.
   *
   * `about` names the clinical subject as an entity rather than leaving the
   * page to be inferred from its title, which is what lets an answer engine
   * connect "digoxin toxicity" here to the same concept elsewhere.
   * `wordCount` and `timeRequired` stop a page being read as a stub — a real
   * risk in a library this size, where the pattern is what gets judged rather
   * than the individual page.
   */
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
    ...(p.author
      ? {
          author: {
            "@type": "Person",
            name: p.author.name,
            honorificSuffix: p.author.honorific,
            jobTitle: p.author.jobTitle,
            knowsAbout: p.author.knowsAbout ?? [],
            ...(p.author.sameAs?.length ? { sameAs: p.author.sameAs } : {}),
            worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url },
          },
        }
      : {}),
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
    about: p.entity
      ? { "@type": "MedicalEntity", name: p.entity }
      : { "@type": "Thing", name: "NCLEX-RN", sameAs: "https://www.nclex.com/" },
    mentions: [
      { "@type": "Thing", name: "NCLEX-RN", sameAs: "https://www.nclex.com/" },
      ...(p.topic?.title ? [{ "@type": "Thing", name: p.topic.title }] : []),
    ],
    isPartOf: {
      "@type": "CollectionPage",
      name: "Nursing library",
      "@id": `${SITE.url}/nursing`,
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
        topic={p.topic?.slug ?? undefined}
        resource={p.leadMagnet?.slug ?? undefined}
        experiment={p.experiment}
        library="nursing"
      />

      <Section className="pt-10 pb-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
          <article className="min-w-0 max-w-[42rem]">
            <Breadcrumbs trail={trail} />

            <p className="eyebrow mt-6">
              {FAMILY_LABEL[p.family ?? ""] ?? "Nursing library"}
            </p>
            <h1 className="mt-2 text-[2.125rem] leading-[1.05] sm:text-[2.625rem]">
              {p.h1}
            </h1>

            <div className="mt-5">
              <Byline
                by={
                  p.author?.name
                    ? `${p.author.name}, ${p.author.honorific}`
                    : undefined
                }
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

            <div className="prose-ns mt-10">
              {sections.map((s, i) => (
                <div key={s._key}>
                  <h2 id={anchor(s.h2!)} className="scroll-mt-24">
                    {s.h2}
                  </h2>
                  <PortableBody value={s.body} />

                  {/* The offer, mid-article. Whether it renders here, at the
                      end, or in both places is the gate_placement experiment;
                      the component decides and records which it showed. */}
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

              {localTopic && (
                <p>
                  The next step on this is the same as on everything else here:
                  answer questions and read the rationales. Our{" "}
                  <Link href={`/nclex-practice-questions/${localTopic.slug}`}>
                    {localTopic.name.toLowerCase()} practice questions
                  </Link>{" "}
                  are the closest set to what this page covers.
                </p>
              )}
            </div>

            {/* one question, in the article, because the argument of this whole
                site is that a question beats a paragraph */}
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

            {/*
              The crawl path, and the reason it sits in the article rather than
              only in the sidebar: a rail inside the main content is followed,
              a rail in an aside is often treated as navigation and discounted.
              At a thousand pages that is the difference between a connected
              library and a thousand pages reachable only from a sitemap.
            */}
            {readNext.length > 0 && (
              <div className="mt-14 border-t border-rule pt-5">
                <p className="eyebrow">
                  More on {p.topic?.title?.toLowerCase() ?? "this topic"}
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {readNext.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/nursing/${r.slug}`} className="cell h-full">
                        <p className="eyebrow">
                          {FAMILY_LABEL[r.family ?? ""] ?? "Nursing"} · {r.minutes} min
                        </p>
                        <p className="mt-2 font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                          {r.entity ?? r.title}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relatedGuides.length > 0 && (
              <div className="mt-10 border-t border-rule pt-5">
                <p className="eyebrow">Guides on this</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {relatedGuides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="font-body text-[0.9375rem] text-ink underline decoration-rule underline-offset-4 hover:text-teal"
                      >
                        {g.title}
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
                  ...(faqs.length > 0 ? [{ label: "Common questions", href: "#faq" }] : []),
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
