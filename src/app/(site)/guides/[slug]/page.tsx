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
import { buildClient, sanityFetch, GUIDE_PAGE_TAGS, tags } from "@/sanity/client";
import {
  GUIDE_BY_SLUG_QUERY,
  GUIDE_SEO_QUERY,
  GUIDE_SLUGS_QUERY,
} from "@/sanity/queries";
import type {
  GUIDE_BY_SLUG_QUERY_RESULT,
  GUIDE_SEO_QUERY_RESULT,
} from "@/sanity.types";

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
  /* Straight past the CDN. This runs once at build time and a cached slug list
     is how a guide published ninety seconds ago misses the build entirely. */
  const slugs = await buildClient.fetch<string[]>(GUIDE_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = await sanityFetch<GUIDE_SEO_QUERY_RESULT>(GUIDE_SEO_QUERY, {
    params: { slug },
    tags: [tags.guide(slug), tags.authors],
  });
  if (!g) return {};

  /* Cut the description on a sentence, not mid-word at 155 — a truncated
     snippet reads as scraped, and assistants quote descriptions verbatim. */
  const fallback =
    g.shortAnswer.length <= 158
      ? g.shortAnswer
      : `${g.shortAnswer.slice(0, 155).replace(/[\s,;:]+\S*$/, "")}…`;
  const description = g.seo?.description || fallback;

  return {
    title: { absolute: `${g.seo?.title || g.title} | Nursia` },
    description,
    alternates: { canonical: `/guides/${g.slug}` },
    ...(g.seo?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: g.h1,
      description,
      url: `/guides/${g.slug}`,
      publishedTime: `${g.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${g.updatedAt}T00:00:00.000Z`,
      /* No `authors` entry: see the note by articleSchema below. */
    },
    twitter: { card: "summary_large_image", title: g.h1, description },
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

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const g = await sanityFetch<GUIDE_BY_SLUG_QUERY_RESULT>(GUIDE_BY_SLUG_QUERY, {
    params: { slug },
    tags: [tags.guide(slug), ...GUIDE_PAGE_TAGS],
  });
  if (!g) notFound();

  const trail = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: g.title },
  ];

  /* The questions stay in the repo, and this is the seam. Sanity owns the
     editorial wrapper around a topic; the items themselves are versioned,
     reviewed in pull requests, and rendered into the static HTML — which is
     the whole reason these pages rank. The slug is the contract between them. */
  const localTopic = g.topic?.slug ? topicBySlug(g.topic.slug) : undefined;
  const sample = localTopic?.questions?.[0]
    ? QUESTIONS[localTopic.questions[0]]
    : null;
  const topicCount = localTopic
    ? localTopic.count ?? playableCount(localTopic.slug)
    : 0;

  const url = `${SITE.url}/guides/${g.slug}`;
  const sections = g.sections ?? [];
  const faqs = (g.faqs ?? []).filter((f) => f.q && f.a) as { q: string; a: string }[];

  /* Word count from the rendered text rather than a stored number, so it
     cannot drift away from the page it describes after an edit. */
  const words =
    countWords(g.shortAnswer) +
    sections.reduce((n, s) => n + countBlocks(s.body), 0) +
    faqs.reduce((n, f) => n + countWords(`${f.q} ${f.a}`), 0);

  /* One Article node, fully described. The extra properties are not padding:
     `about`/`mentions` tie the page to entities an answer engine can resolve,
     `author` carries the credential that makes health content quotable, and
     `wordCount`/`timeRequired` stop it being read as a stub. */
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: g.h1,
    name: g.title,
    description: g.shortAnswer,
    abstract: g.shortAnswer,
    articleSection: sections.map((s) => s.h2),
    inLanguage: "en-US",
    isAccessibleForFree: true,
    wordCount: words,
    timeRequired: `PT${g.minutes}M`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    /*
     * No `author` or `reviewedBy` node here for the time being.
     *
     * The byline these fields fed was a named, credentialed nurse who does
     * not exist — invented copy, not a placeholder for a real reviewer.
     * Claiming authorship by a fictitious licensed professional on health
     * content is the kind of thing that costs trust the moment it is
     * noticed, so it comes out everywhere rather than staying live while a
     * real byline is sorted out. Reintroduce this once `g.author` points at
     * an actual named reviewer.
     */
    publisher: {
      "@type": "Organization",
      "@id": `${SITE.url}#organization`,
      name: SITE.name,
      url: SITE.url,
    },
    datePublished: g.publishedAt,
    dateModified: g.updatedAt,
    about: { "@type": "Thing", name: "NCLEX-RN", sameAs: "https://www.nclex.com/" },
    ...(g.topic?.category
      ? { mentions: [{ "@type": "Thing", name: g.topic.category }] }
      : {}),
    isPartOf: { "@type": "CollectionPage", name: "NCLEX Guides", "@id": `${SITE.url}/guides` },
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
        guide={g.slug!}
        cluster={g.cluster ?? undefined}
        topic={g.topic?.slug ?? undefined}
        resource={g.leadMagnet?.slug ?? undefined}
        experiment={g.experiment}
      />

      <Section className="pt-10 pb-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
          <article className="min-w-0 max-w-[42rem]">
            <Breadcrumbs trail={trail} />

            <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.625rem]">{g.h1}</h1>

            <div className="mt-5">
              <Byline
                updated={monthYear(g.updatedAt!)}
                minutes={g.minutes ?? undefined}
              />
            </div>

            {/* Short answer — the first 60 words, written for the snippet */}
            <div className="mt-8 border-l-2 border-teal pl-5">
              <p className="eyebrow">Short answer</p>
              <p className="mt-2.5 font-body text-[1.0625rem] leading-[1.68] text-ink sm:text-[1.125rem]">
                {g.shortAnswer}
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
                  {i === 1 && g.leadMagnet && (
                    <ResourceGate
                      resource={g.leadMagnet}
                      experiment={g.experiment}
                      guideSlug={g.slug!}
                      at="mid"
                    />
                  )}
                </div>
              ))}

              {localTopic && (
                <p>
                  Whatever you take from this, the next step is the same: answer questions and
                  read the rationales. Our{" "}
                  <Link href={`/nclex-practice-questions/${localTopic.slug}`}>
                    {localTopic.name.toLowerCase()} practice questions
                  </Link>{" "}
                  are the closest set to what this guide covers, there are ten more on the{" "}
                  <Link href="/nclex-practice-questions">practice questions hub</Link>, and the{" "}
                  <Link href="/pricing">pricing page</Link> spells out what the free tier includes.
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

            {/* The long-tail phrasings the body cannot answer without turning
                into a list. Visible copy first, schema second — never the
                other way round. */}
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

            {g.leadMagnet && (
              <ResourceGate
                resource={g.leadMagnet}
                experiment={g.experiment}
                guideSlug={g.slug!}
                at="end"
              />
            )}

            {/* Into the review programme. The guides rank; these links are how
                a review page published last week gets crawled without waiting
                for the sitemap to be believed. */}
            {g.relatedReviews && g.relatedReviews.length > 0 && (
              <div className="mt-14 border-t border-rule pt-5">
                <p className="eyebrow">Revise the subject</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {g.relatedReviews.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/nclex-review/${r.slug}`}
                        className="font-body text-[0.9375rem] text-ink underline decoration-rule underline-offset-4 hover:text-teal"
                      >
                        {r.title}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-muted">
                        {r.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {g.readNext && g.readNext.length > 0 && (
              <div className="mt-10 border-t border-rule pt-5">
                <p className="eyebrow">Read next</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {g.readNext.map((n) => (
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
