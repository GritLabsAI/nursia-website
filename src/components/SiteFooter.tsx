import Link from "next/link";
import { GUIDES, SITE, topicsIn } from "@/lib/content";
import { Wordmark } from "./Wordmark";

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
export function SiteFooter() {
  return (
    <footer className="flowsheet border-t border-white/12 bg-ink text-white">
      <div className="mx-auto max-w-[1140px] px-5 py-16 sm:px-8">
        {/* Three stacked link columns ran ~1500px on a phone. Two-up from the
            smallest screen halves that; the brand block keeps the full width. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 max-w-xs lg:col-span-1">
            <Wordmark tone="paper" />
            <p className="mt-3 text-[0.875rem] leading-relaxed text-white/60">{SITE.tagline}</p>
            <div className="mt-5 flex gap-4">
              {["Instagram", "TikTok", "YouTube"].map((s) => (
                <a
                  key={s}
                  href={`https://${s.toLowerCase()}.com/nursia`}
                  className="text-[0.8125rem] text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-highlight"
                >
                  {s}
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
            {GUIDES.slice(0, 6).map((g) => (
              <FootLink key={g.slug} href={`/guides/${g.slug}`}>
                {g.title}
              </FootLink>
            ))}
            <FootLink href="/guides">All guides →</FootLink>
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
          {/* Signup CTA temporarily hidden — not working yet.
          <Link href="/signup" className="btn btn-invert sm:ml-auto">
            Start free →
          </Link>
          */}
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
            <Wordmark />
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
