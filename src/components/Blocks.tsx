import Link from "next/link";
import type { Faq } from "@/lib/content";

/* ------------------------------------------------------------------ layout */

export function Section({
  children,
  className = "",
  id,
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bleed?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <div className={bleed ? "" : "mx-auto max-w-[1140px] px-5 sm:px-8"}>{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="border-t border-rule pt-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 max-w-2xl text-[1.75rem] sm:text-[2.125rem]">{title}</h2>
      {note && (
        <p className="mt-3 max-w-2xl font-body text-[1rem] leading-relaxed text-ink-2">{note}</p>
      )}
    </div>
  );
}

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-7">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center gap-2">
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-teal">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink">{c.label}</span>
            )}
            {i < trail.length - 1 && <span aria-hidden>›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* --------------------------------------------------------------- CTA slots */

/**
 * Slot 2 — above the fold. One primary button plus the risk-remover line.
 * Every CTA on the site uses the same three words and lands on /signup.
 */
export function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${className}`}>
      {/* Signup CTA temporarily hidden — not working yet.
      <Link href="/signup" className="btn btn-primary">
        Start free →
      </Link>
      */}
      <span className="font-mono text-[11px] text-muted">No card needed</span>
    </div>
  );
}

/**
 * Slot 3 — inline, mid-content. On long pages this converts on curiosity
 * rather than persuasion, so it asks a question instead of making a pitch.
 */
export function InlineCta({ prompt, action }: { prompt: string; action: string }) {
  // action is unused while the signup CTA below is hidden.
  void action;
  return (
    <aside className="my-12 flex flex-col gap-4 rounded-sm border border-ink bg-paper-2 px-6 py-6 sm:flex-row sm:items-center sm:gap-8">
      <div>
        <p className="eyebrow">2 questions · 30 seconds</p>
        <p className="mt-2 max-w-xl font-display text-[1.1875rem] font-bold leading-snug tracking-[-0.02em] text-ink">
          {prompt}
        </p>
      </div>
      {/* Signup CTA temporarily hidden — not working yet.
      <Link href="/signup" className="btn btn-ghost shrink-0 sm:ml-auto">
        {action}
      </Link>
      */}
    </aside>
  );
}

/** Slot 4 — end of content, full-width dark band, same words as slot 2. */
export function CtaBand({
  heading = "50 free questions. No card.",
  sub = "Answer 50 real NCLEX items, get full rationales, and see which topics are costing you marks.",
}: {
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="flowsheet mt-20 bg-ink text-white">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-end">
        <div className="max-w-xl">
          <h2 className="text-[2rem] leading-[1.08] sm:text-[2.5rem]">{heading}</h2>
          <p className="mt-4 font-body text-base leading-relaxed text-white/65">{sub}</p>
        </div>
        <div className="md:ml-auto md:shrink-0">
          {/* Signup CTA temporarily hidden — not working yet.
          <Link href="/signup" className="btn btn-invert">
            Start free →
          </Link>
          */}
          <p className="mt-3 font-mono text-[11px] text-white/45">
            Cancel anytime · 14-day refund
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- FAQ + co */

export function FaqList({ items, id }: { items: Faq[]; id?: string }) {
  return (
    <div id={id} className="scroll-mt-24 border-t border-rule">
      {items.map((f) => (
        <details key={f.q} className="acc">
          <summary>{f.q}</summary>
          <p className="pb-5 font-body text-[0.9375rem] leading-[1.7] text-ink-2 sm:text-base">
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function FaqSchema({ items }: { items: Faq[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export function BreadcrumbSchema({
  trail,
}: {
  trail: { label: string; href?: string }[];
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `https://nursia.com${c.href}` } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/* ------------------------------------------------------------------ pieces */

/** A fact with a number. Mono for the value, because it is checkable. */
export function Fact({
  value,
  label,
  note,
}: {
  value: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="border-t-2 border-ink pt-3">
      <p className="font-mono text-[1.625rem] font-medium leading-none tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="mt-2 text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">{label}</p>
      {note && <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{note}</p>}
    </div>
  );
}

/** "On this page" rail for the long SEO templates. */
export function OnThisPage({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav aria-label="On this page" className="border-t border-rule pt-4">
      <p className="eyebrow">On this page</p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <a
              href={i.href}
              className="text-[0.875rem] text-ink-2 transition-colors hover:text-teal"
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Reviewed-by byline. Links to /about, and carries a visible update date. */
export function Byline({
  by = "Dana Whitfield, RN, MSN",
  updated,
  minutes,
}: {
  by?: string;
  updated: string;
  minutes?: number;
}) {
  return (
    <p className="font-mono text-[11px] leading-relaxed text-muted">
      Written and reviewed by{" "}
      <Link href="/about#reviewers" className="text-ink underline underline-offset-4 hover:text-teal">
        {by}
      </Link>
      {minutes ? ` · ${minutes} min read` : ""} · Updated {updated}
    </p>
  );
}
