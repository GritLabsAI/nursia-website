import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, BreadcrumbSchema, CtaBand, Section } from "@/components/Blocks";
import { SITE, TOPICS } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { NURSING_INDEX_QUERY } from "@/sanity/nursing-queries";
import type { NURSING_INDEX_QUERY_RESULT } from "@/sanity.types";

/**
 * The hub for the nursing library.
 *
 * This page has one job that matters more than how it reads: it is the only
 * place from which every page in the library is one click away. A thousand
 * pages submitted in a sitemap and linked from nowhere is a thousand pages a
 * crawler is entitled to ignore — the sitemap says "these exist", and an
 * internal link says "these matter", and only the second is a ranking signal.
 *
 * So the whole index renders. Not the top fifty with a "load more" that needs
 * JavaScript, not a paginated list twenty deep: every page, grouped by the
 * question-bank topic it belongs to, in static HTML. It is a long document and
 * that is the correct trade — it is read by machines far more often than by
 * people, and the people who do read it are scanning for one subject.
 *
 * Grouped by topic rather than listed flat because the grouping is the second
 * job: it gives each cluster a visible boundary, which is what lets a crawler
 * infer that forty cardiovascular pages are one subject rather than forty
 * unrelated documents that happen to share a prefix.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "The nursing library — conditions, drugs and skills | Nursia" },
  description:
    "Every clinical subject on the NCLEX, answered at revision depth: conditions, medications, procedures, labs and the judgement skills the exam tests.",
  alternates: { canonical: "/nursing" },
};

/** Topic display order follows the question bank, not the alphabet. */
const TOPIC_ORDER = new Map(TOPICS.map((t, i) => [t.slug, i]));

export default async function NursingHub() {
  const pages = await sanityFetch<NURSING_INDEX_QUERY_RESULT>(NURSING_INDEX_QUERY, {
    tags: [tags.nursingPages, tags.topics],
  });

  const trail = [{ label: "Home", href: "/" }, { label: "Nursing library" }];

  const byTopic = new Map<string, { title: string; slug: string; pages: typeof pages }>();
  for (const page of pages) {
    const slug = page.topic?.slug ?? "other";
    const entry = byTopic.get(slug) ?? {
      slug,
      title: page.topic?.title ?? "Everything else",
      pages: [],
    };
    entry.pages.push(page);
    byTopic.set(slug, entry);
  }

  const groups = [...byTopic.values()].sort(
    (a, b) => (TOPIC_ORDER.get(a.slug) ?? 99) - (TOPIC_ORDER.get(b.slug) ?? 99),
  );

  /*
   * A CollectionPage with the groups as parts.
   *
   * Not an ItemList of a thousand URLs: that is a wall of markup no crawler
   * needs, since the links themselves are already in the HTML and are the
   * thing that gets followed. What the schema adds is the shape — that this is
   * one collection of twenty subject clusters — which the links alone do not
   * say.
   */
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE.url}/nursing`,
    name: "The nursing library",
    description:
      "Clinical subjects, medications, procedures and exam skills for the NCLEX.",
    url: `${SITE.url}/nursing`,
    isPartOf: { "@type": "WebSite", "@id": `${SITE.url}#website` },
    hasPart: groups.map((g) => ({
      "@type": "CollectionPage",
      name: g.title,
      url: `${SITE.url}/nursing#${g.slug}`,
    })),
  };

  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <Section className="pt-10 pb-14">
        <Breadcrumbs trail={trail} />

        <h1 className="mt-6 text-[2.125rem] leading-[1.05] sm:text-[2.625rem]">
          The nursing library
        </h1>
        <p className="mt-5 max-w-[42rem] font-body text-[1.0625rem] leading-[1.68] text-ink-2">
          {pages.length.toLocaleString()} pages covering the clinical subjects the
          NCLEX actually tests — conditions, medications, procedures, lab values
          and the judgement skills the questions are built on. Each one ends where
          it should: at a set of practice questions.
        </p>

        {/* Jump list. Twenty links at the top of a very long page, so a reader
            who wants pharmacology does not scroll past cardiology to find it. */}
        <nav className="mt-8 flex flex-wrap gap-x-4 gap-y-2" aria-label="Topics">
          {groups.map((g) => (
            <a
              key={g.slug}
              href={`#${g.slug}`}
              className="font-mono text-[11px] uppercase tracking-wide text-muted hover:text-teal"
            >
              {g.title} ({g.pages.length})
            </a>
          ))}
        </nav>

        <div className="mt-14 flex flex-col gap-14">
          {groups.map((g) => (
            <section key={g.slug} id={g.slug} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
                <h2 className="text-[1.5rem] sm:text-[1.75rem]">{g.title}</h2>
                <Link
                  href={`/nclex-practice-questions/${g.slug}`}
                  className="font-mono text-[11px] uppercase tracking-wide text-muted hover:text-teal"
                >
                  Practise {g.title.toLowerCase()} →
                </Link>
              </div>

              <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {g.pages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/nursing/${page.slug}`}
                      className="font-body text-[0.9375rem] leading-snug text-ink underline decoration-rule underline-offset-4 hover:text-teal"
                    >
                      {page.entity ?? page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>

      <CtaBand />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}
