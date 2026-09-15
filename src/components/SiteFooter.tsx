import Link from "next/link";
import { APP_LOGIN_URL } from "@/lib/app-handoff";
import { SITE, SOCIAL, topicsIn } from "@/lib/content";
import { sanityFetch, tags } from "@/sanity/client";
import { GUIDES_INDEX_QUERY } from "@/sanity/queries";
import type { GUIDES_INDEX_QUERY_RESULT } from "@/sanity.types";
import { Logo } from "./Logo";

const LEGAL = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refunds", href: "/refunds" },
];

const TRADEMARK =
  "NCLEX® and NCLEX-RN® are registered trademarks of the National Council of State Boards of Nursing, Inc. We are not affiliated with or endorsed by NCSBN.";

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow !text-white/45">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[0.875rem] text-white/70 transition-colors hover:text-highlight"
      >
        {children}
      </Link>
    </li>
  );
}

/**
 * Full footer — the site's real sitemap. The nav only holds five links, so every
 * topic page and guide is linked from here and nothing ends up orphaned.
 * Used everywhere except /signup and /try.
 */
/**
 * Async because the guide links come from Sanity.
 *
 * A footer is an odd place to do a fetch and it is the right call here: this
 * runs inside a server component on a prerendered page, so the cost is paid at
 * build and the tag-based revalidation keeps it current. The alternative —
 * hard-coding six guide slugs — is a list that silently rots the first time
 * somebody unpublishes one.
 */
export async function SiteFooter() {
  const guides = await sanityFetch<GUIDES_INDEX_QUERY_RESULT>(GUIDES_INDEX_QUERY, {
    tags: [tags.guides],
  });

  return (
    <footer className="flowsheet border-t border-white/12 bg-ink text-white">
      <div className="mx-auto max-w-[1140px] px-5 py-16 sm:px-8">
        {/* Three stacked link columns ran ~1500px on a phone. Two-up from the
            smallest screen halves that; the brand block keeps the full width. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 max-w-xs lg:col-span-1">
            {/* The primary yellow tile, with the paper word the ink ground needs. */}
            <Logo tone="paper" label="Nursia" />
            <p className="mt-3 text-[0.875rem] leading-relaxed text-white/60">{SITE.tagline}</p>
            <div className="mt-5 flex gap-4">
              {SOCIAL.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  rel="me noopener noreferrer"
                  target="_blank"
                  className="text-[0.8125rem] text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-highlight"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          <Col title="Practice by topic">
            {[...topicsIn("category"), ...topicsIn("format")].map((t) => (
              <FootLink key={t.slug} href={`/nclex-practice-questions/${t.slug}`}>
                {t.name}
              </FootLink>
            ))}
            <FootLink href="/practice">Every topic →</FootLink>
          </Col>

          <Col title="Guides">
            {guides.slice(0, 6).map((g) => (
              <FootLink key={g._id} href={`/guides/${g.slug}`}>
                {g.title}
              </FootLink>
            ))}
            <FootLink href="/guides">All guides →</FootLink>
            {/* Site-wide, so the review hub is one hop from every page rather
                than only from the topic pages that happen to link into it. */}
            <FootLink href="/nclex-review">NCLEX review by subject →</FootLink>
            {/* And the nursing library, for the same reason and more urgently:
                a thousand pages hang off that one hub, so if it is reachable
                only from itself the entire library is two hops from nowhere. */}
            <FootLink href="/nursing">The nursing library →</FootLink>
          </Col>

          <Col title="Company">
            <FootLink href="/about">About us</FootLink>
            <FootLink href="/about#reviewers">Who writes the questions</FootLink>
            <FootLink href="/contact">Contact</FootLink>
            <FootLink href="/pricing">Pricing</FootLink>
            <FootLink href="/refunds">Refund policy</FootLink>
            <FootLink href="/pricing#cancel">Cancel anytime</FootLink>
            <FootLink href="/contact?about=question">Report a bad question</FootLink>
          </Col>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/12 pt-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-bold tracking-[-0.02em]">
              {SITE.freeQuestions} free questions
            </p>
            <p className="text-[0.875rem] text-white/55">No card. Cancel anytime.</p>
          </div>
          <Link href={APP_LOGIN_URL} className="btn btn-invert sm:ml-auto">
            Start free →
          </Link>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/12 pt-6 sm:flex-row sm:items-start">
          <p className="max-w-2xl text-[0.75rem] leading-relaxed text-white/40">
            © 2026 {SITE.name}. {TRADEMARK}
          </p>
          <ul className="flex gap-5 sm:ml-auto">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[0.75rem] text-white/50 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/**
 * Light footer for /signup and /try — no topic links pulling people out of the
 * funnel, and no CTA competing with the one on the page.
 */
export function MinimalFooter() {
  return (
    <footer className="rule-t mt-auto border-t border-rule bg-paper">
      <div className="mx-auto max-w-[1140px] px-5 py-10 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo label="Nursia" />
            <a
              href={`mailto:${SITE.email}`}
              className="mt-2 block font-mono text-[0.8125rem] text-muted transition-colors hover:text-teal"
            >
              {SITE.email}
            </a>
          </div>
          {[
            {
              title: "Site",
              links: [
                { label: "Practice", href: "/nclex-practice-questions" },
                { label: "Guides", href: "/guides" },
                { label: "Review by subject", href: "/nclex-review" },
                { label: "Pricing", href: "/pricing" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Report a question", href: "/contact?about=question" },
              ],
            },
            { title: "Legal", links: LEGAL },
          ].map((col) => (
            <div key={col.title}>
              <h2 className="eyebrow">{col.title}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[0.875rem] text-ink-2 transition-colors hover:text-teal"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-9 border-t border-rule pt-5 text-[0.75rem] leading-relaxed text-muted">
          © 2026 {SITE.name}. NCLEX® is a registered trademark of NCSBN. Not affiliated with or
          endorsed by NCSBN.
        </p>
      </div>
    </footer>
  );
}
