import Link from "next/link";
import type { Metadata } from "next";
import {
  BreadcrumbSchema,
  Breadcrumbs,
  CtaBand,
  InlineCta,
  PrimaryCta,
  Section,
  SectionHead,
} from "@/components/Blocks";
import { SITE, topicBySlug } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { SEO_PAGES_INDEX_QUERY } from "@/sanity/queries";
import type { SEO_PAGES_INDEX_QUERY_RESULT } from "@/sanity.types";

/**
 * The review hub.
 *
 * Two jobs, and the second is the one that justifies building it. The first is
 * the obvious one: somebody revising wants to see what is covered. The second
 * is that every page the pipeline publishes needs an inbound link from a page
 * that is already crawled, or it is reachable only through the sitemap — and a
 * page reachable only through the sitemap is crawled late, re-crawled later,
 * and inherits none of the authority the rest of the site has accumulated.
 *
 * Grouped by the NCLEX test plan category rather than by our own page kinds,
 * because that is the vocabulary a candidate already has. Nobody revising has
 * ever thought "I should do the medication-kind pages".
 */

export const revalidate = 3600;

const TRAIL = [{ label: "Home", href: "/" }, { label: "NCLEX review" }];

/**
 * The order NCSBN lists the categories in, so the page reads like the test plan
 * rather than like an alphabetical dump. Anything not named here — a body
 * system, a category from a later export — falls to the end in the order the
 * query returned, which is alphabetical.
 */
const CATEGORY_ORDER = [
  "Management of Care",
  "Safety and Infection Control",
  "Health Promotion and Maintenance",
  "Psychosocial Integrity",
  "Basic Care and Comfort",
  "Pharmacological Therapies",
  "Pharmacology",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
];

const KIND_LABEL: Record<string, string> = {
  practice: "practice",
  review: "review",
  clinical: "nursing care",
  medication: "medication",
  strategy: "strategy",
};

export async function generateMetadata(): Promise<Metadata> {
  /* The count is read rather than written down. It appears in the title, the
     opening paragraph and the schema, and the one thing worse than an
     inaccurate count is three inaccurate counts that disagree. */
  const pages = await sanityFetch<SEO_PAGES_INDEX_QUERY_RESULT>(SEO_PAGES_INDEX_QUERY, {
    tags: [tags.seoPages],
  });
  return {
    title: {
      absolute: "NCLEX Review — every subject, by test plan category | Nursia",
    },
    description: `${pages.length} NCLEX-RN review pages grouped by test plan category: what is actually tested on each subject, how the exam asks it, and the question set to practise it against.`,
    alternates: { canonical: "/nclex-review" },
  };
}

export default async function ReviewIndexPage() {
  const pages = await sanityFetch<SEO_PAGES_INDEX_QUERY_RESULT>(SEO_PAGES_INDEX_QUERY, {
    tags: [tags.seoPages, tags.topics],
  });

  const categories = [...new Set(pages.map((p) => p.examCategory).filter(Boolean))].sort(
    (a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a!);
      const bi = CATEGORY_ORDER.indexOf(b!);
      if (ai === -1 && bi === -1) return a!.localeCompare(b!);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    },
  );

  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />
      {/* The hub declares its own inventory, so an answer engine gets every page,
          its position and its freshness in one fetch. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE.url}/nclex-review`,
            name: "NCLEX Review",
            description: `${pages.length} NCLEX-RN review pages, grouped by test plan category.`,
            inLanguage: "en-US",
            isPartOf: { "@id": `${SITE.url}#website` },
            about: { "@type": "Thing", name: "NCLEX-RN" },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: pages.length,
              itemListElement: pages.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.title,
                url: `${SITE.url}/nclex-review/${p.slug}`,
              })),
            },
          }),
        }}
      />

      <Section className="pt-10 pb-14">
        <div className="max-w-3xl">
          <Breadcrumbs trail={TRAIL} />
          <h1 className="text-[2.25rem] leading-[1.04] sm:text-[3rem]">NCLEX review by subject</h1>

          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
            {pages.length} pages, one per subject, grouped the way the test plan groups them. Each
            one says what is actually tested, what the exam repeats, and where the exam answer and
            the ward answer come apart — then sends you to the question set for that subject,
            because reading about prioritisation and answering a prioritisation question are not
            the same skill and only one of them is scored.
          </p>

          <PrimaryCta className="mt-7" />

          {categories.map((category, ci) => {
            const inCategory = pages.filter((p) => p.examCategory === category);
            return (
              <div key={category} className="mt-16">
                <SectionHead
                  eyebrow={`${inCategory.length} page${inCategory.length === 1 ? "" : "s"}`}
                  title={category!}
                />
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {inCategory.map((p) => {
                    const topic = p.topicSlug ? topicBySlug(p.topicSlug) : undefined;
                    return (
                      <Link
                        key={p._id}
                        href={`/nclex-review/${p.slug}`}
                        className="cell flex items-center gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                            {p.title}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-muted">
                            {KIND_LABEL[p.kind ?? ""] ?? "review"} · {p.minutes} min
                            {topic ? ` · → ${topic.name.toLowerCase()}` : ""}
                          </p>
                        </div>
                        <span className="ml-auto shrink-0 font-mono text-[0.8125rem] text-teal">
                          →
                        </span>
                      </Link>
                    );
                  })}
                </div>
                {ci === 0 && (
                  <InlineCta
                    prompt="Reading is revision. Answering is practice. Do two questions and see the difference."
                    action="Try 2 →"
                  />
                )}
              </div>
            );
          })}

          <div className="mt-16 border-t border-rule pt-5">
            <p className="eyebrow">Also</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "The guides", href: "/guides", note: "how the exam works" },
                {
                  label: "10 free questions",
                  href: "/nclex-practice-questions",
                  note: "no account",
                },
                { label: "Pricing", href: "/pricing", note: "one plan" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="cell h-full">
                    <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {l.label}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{l.note}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
