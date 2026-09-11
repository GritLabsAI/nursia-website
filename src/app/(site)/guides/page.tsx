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
import { CLUSTERS, SITE, topicBySlug } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { GUIDES_INDEX_QUERY } from "@/sanity/queries";
import type { GUIDES_INDEX_QUERYResult } from "@/sanity.types";

export const revalidate = 3600;

type GuideCardData = GUIDES_INDEX_QUERYResult[number];

const TRAIL = [{ label: "Home", href: "/" }, { label: "Guides" }];

/**
 * The count is read rather than written down.
 *
 * It appears in the metadata, in the opening paragraph, and in the
 * CollectionPage schema, and the one thing worse than an inaccurate count in
 * three places is an inaccurate count in three places that disagree. Every one
 * of them comes off the same fetch, so publishing a guide updates all of them
 * and nobody has to remember.
 */
export async function generateMetadata(): Promise<Metadata> {
  const guides = await sanityFetch<GUIDES_INDEX_QUERYResult>(GUIDES_INDEX_QUERY, {
    tags: [tags.guides],
  });
  return {
    title: {
      absolute: "NCLEX Guides — study plans, scoring, content, test day | Nursia",
    },
    description: `${guides.length} NCLEX-RN guides grouped by where you are in your prep: before you start, while you study, the content that decides scores, and test day and after. Written and reviewed by nurses.`,
    alternates: { canonical: "/guides" },
  };
}

function GuideCard({ g, featured = false }: { g: GuideCardData; featured?: boolean }) {
  const topic = g.topicSlug ? topicBySlug(g.topicSlug) : undefined;

  if (featured) {
    return (
      <Link href={`/guides/${g.slug}`} className="cell group sm:row-span-2">
        <p className="eyebrow">Featured · {g.minutes} min</p>
        <h3 className="mt-3 text-[1.375rem] leading-tight">{g.title}</h3>
        <p className="mt-3 font-body text-[0.9375rem] leading-[1.6] text-ink-2">
          {g.shortAnswer.split(". ").slice(0, 2).join(". ")}.
        </p>
        <p className="mt-4 font-mono text-[11px] text-muted">
          RN reviewed{topic ? ` · links to ${topic.name.toLowerCase()}` : ""}
        </p>
      </Link>
    );
  }

  return (
    <Link href={`/guides/${g.slug}`} className="cell flex items-center gap-4">
      <div className="min-w-0">
        <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
          {g.title}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {g.minutes} min{topic ? ` · → ${topic.name.toLowerCase()}` : ""}
        </p>
      </div>
      <span className="ml-auto shrink-0 font-mono text-[0.8125rem] text-teal">→</span>
    </Link>
  );
}

export default async function GuidesPage() {
  const guides = await sanityFetch<GUIDES_INDEX_QUERYResult>(GUIDES_INDEX_QUERY, {
    tags: [tags.guides, tags.topics],
  });

  const count = guides.length;
  const deepDives = guides.filter((g) => g.cluster === "content").length;
  const byCluster = (id: string) => guides.filter((g) => g.cluster === id);

  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />
      {/* The hub declares its own inventory. An answer engine that reads this
          gets every guide, its position, and its freshness in one fetch. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE.url}/guides`,
            name: "NCLEX Guides",
            description: `${count} NCLEX-RN guides written and reviewed by registered nurses.`,
            inLanguage: "en-US",
            isPartOf: { "@id": `${SITE.url}#website` },
            about: { "@type": "Thing", name: "NCLEX-RN" },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: count,
              itemListElement: guides.map((g, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: g.title,
                url: `${SITE.url}/guides/${g.slug}`,
              })),
            },
          }),
        }}
      />

      <Section className="pt-10 pb-14">
        <div className="max-w-3xl">
          <Breadcrumbs trail={TRAIL} />
          <h1 className="text-[2.25rem] leading-[1.04] sm:text-[3rem]">Guides for the NCLEX</h1>

          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
            {count} guides, grouped by where you are rather than by when we published them. If you
            are still deciding how seriously to take the exam, start with how hard the NCLEX
            actually is. If you have a date booked, go straight to the 4-week plan. If the gap is
            content rather than method, the third cluster is {deepDives} deep dives on the areas that
            decide most scores. And if you are here after a result you did not want, the last
            cluster is written for you and it does not open with sympathy — it opens with the
            Candidate Performance Report.
          </p>

          <PrimaryCta className="mt-7" />

          {CLUSTERS.map((c, ci) => (
            <div key={c.id} className="mt-16">
              <SectionHead eyebrow={`Cluster ${ci + 1}`} title={c.label} note={c.note} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {byCluster(c.id).map((g, i) => (
                  <GuideCard key={g._id} g={g} featured={i === 0} />
                ))}
              </div>
              {c.id === "during" && (
                <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted">
                  ↑ every guide in this cluster links down to one topic page — that is how a guide
                  earns its keep.
                </p>
              )}
              {ci === 0 && (
                <InlineCta
                  prompt="Guides help. Questions decide. Try two and see where you land."
                  action="Try 2 →"
                />
              )}
            </div>
          ))}

          <div className="mt-16 border-t border-rule pt-5">
            <p className="eyebrow">Also</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "10 free questions", href: "/nclex-practice-questions", note: "no account" },
                { label: "Everything on the site", href: "/nclex", note: "full index" },
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
