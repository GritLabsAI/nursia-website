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
import { CLUSTERS, GUIDES, SITE, topicBySlug } from "@/lib/content";

const COUNT = GUIDES.length;
const DEEP_DIVES = GUIDES.filter((g) => g.cluster === "content").length;

export const metadata: Metadata = {
  title: { absolute: "NCLEX Guides — study plans, scoring, content, test day | Nursia" },
  description: `${COUNT} NCLEX-RN guides grouped by where you are in your prep: before you start, while you study, the content that decides scores, and test day and after. Written and reviewed by nurses.`,
  alternates: { canonical: "/guides" },
};

const TRAIL = [{ label: "Home", href: "/" }, { label: "Guides" }];

function GuideCard({ slug, featured = false }: { slug: string; featured?: boolean }) {
  const g = GUIDES.find((x) => x.slug === slug)!;
  const topic = topicBySlug(g.topic)!;

  if (featured) {
    return (
      <Link href={`/guides/${g.slug}`} className="cell group sm:row-span-2">
        <p className="eyebrow">Featured · {g.minutes} min</p>
        <h3 className="mt-3 text-[1.375rem] leading-tight">{g.title}</h3>
        <p className="mt-3 font-body text-[0.9375rem] leading-[1.6] text-ink-2">
          {g.shortAnswer.split(". ").slice(0, 2).join(". ")}.
        </p>
        <p className="mt-4 font-mono text-[11px] text-muted">
          RN reviewed · links to {topic.name.toLowerCase()}
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
          {g.minutes} min · → {topic.name.toLowerCase()}
        </p>
      </div>
      <span className="ml-auto shrink-0 font-mono text-[0.8125rem] text-teal">→</span>
    </Link>
  );
}

export default function GuidesPage() {
  const byCluster = (id: string) => GUIDES.filter((g) => g.cluster === id);

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
            description: `${COUNT} NCLEX-RN guides written and reviewed by registered nurses.`,
            inLanguage: "en-US",
            isPartOf: { "@id": `${SITE.url}#website` },
            about: { "@type": "Thing", name: "NCLEX-RN" },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: COUNT,
              itemListElement: GUIDES.map((g, i) => ({
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
            {COUNT} guides, grouped by where you are rather than by when we published them. If you
            are still deciding how seriously to take the exam, start with how hard the NCLEX
            actually is. If you have a date booked, go straight to the 4-week plan. If the gap is
            content rather than method, the third cluster is {DEEP_DIVES} deep dives on the areas that
            decide most scores. And if you are here after a result you did not want, the last
            cluster is written for you and it does not open with sympathy — it opens with the
            Candidate Performance Report.
          </p>

          <PrimaryCta className="mt-7" />

          {CLUSTERS.map((c, ci) => (
            <div key={c.id} className="mt-16">
              <SectionHead
                eyebrow={`Cluster ${ci + 1}`}
                title={c.label}
                note={c.note}
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {byCluster(c.id).map((g, i) => (
                  <GuideCard key={g.slug} slug={g.slug} featured={i === 0} />
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
