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
import { CLUSTERS, GUIDES, TOOLS, TOPICS } from "@/lib/content";

const GUIDE_COUNT = GUIDES.length;

export const metadata: Metadata = {
  title: { absolute: "Everything for the NCLEX — the full index | Nursia" },
  description:
    `Every question set, guide, and tool on Nursia in one place: ${TOPICS.length} topic sets, ${GUIDE_COUNT} guides, and the free reference sheets. Nothing on the site is more than two clicks from here.`,
  alternates: { canonical: "/nclex" },
};

const TRAIL = [{ label: "Home", href: "/" }, { label: "Everything for the NCLEX" }];

export default function NclexIndexPage() {
  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />

      <Section className="pt-10 pb-14">
        <div className="max-w-3xl">
          <Breadcrumbs trail={TRAIL} />
          <h1 className="text-[2.25rem] leading-[1.04] sm:text-[3rem]">
            Everything we have written about the NCLEX
          </h1>
          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
            One page listing every question set, guide, and tool on the site. This is the link
            worth putting in a bio or sending in a DM, and it is how a search engine works out the
            shape of the whole site. If something exists here, it is reachable in one more click.
          </p>

          <div className="mt-8 rounded-sm border border-ink bg-paper-2 p-6">
            <p className="eyebrow">Start here</p>
            <p className="mt-2 font-display text-[1.25rem] font-bold leading-snug tracking-[-0.02em]">
              10 free questions, no account
            </p>
            <Link
              href="/nclex-practice-questions"
              className="mt-4 inline-block font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
            >
              → Open the practice hub
            </Link>
          </div>

          <PrimaryCta className="mt-8" />

          {/* -------------------------------------------- 1. question sets */}
          <div className="mt-16">
            <SectionHead
              eyebrow="1 · Question sets"
              title="By topic"
              note={`${TOPICS.length} sets, 1,200 questions. Five on each page are free with no account.`}
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/nclex-practice-questions/${t.slug}`}
                    className="cell flex items-center gap-4"
                  >
                    <span className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {t.name}
                    </span>
                    <span className="ml-auto font-mono text-[0.8125rem] text-teal">
                      {t.count} →
                    </span>
                  </Link>
                </li>
              ))}
              <li className="cell border-dashed">
                <span className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-muted">
                  Unfolding case studies
                </span>
                <span className="ml-2 font-mono text-[11px] text-muted">soon · 40 of 90</span>
              </li>
            </ul>
          </div>

          {/* -------------------------------------------------- 2. guides */}
          <div className="mt-16">
            <SectionHead
              eyebrow="2 · Guides"
              title="Written explanations"
              note={`${GUIDE_COUNT} guides in ${CLUSTERS.length} clusters on the guides hub, grouped by where you are in your prep. Listed flat here.`}
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {GUIDES.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="cell flex items-center gap-4">
                    <span className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {g.title}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[0.8125rem] text-muted">
                      {g.minutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <InlineCta
            prompt="Not sure where to start? Two questions and we will point you at the right topic."
            action="Check my level →"
          />

          {/* --------------------------------------------------- 3. tools */}
          <div className="mt-4">
            <SectionHead
              eyebrow="3 · Tools and reference"
              title="Free, no account"
              note="Small pages that are genuinely useful on their own — which is also why they earn links."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <li key={t.name}>
                  <Link href={t.href} className="cell h-full">
                    <p className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">
                      {t.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{t.note}</p>
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
