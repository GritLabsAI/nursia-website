import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { CtaLink } from "@/components/lp/CtaLink";

/**
 * The furniture the three ad landing pages share.
 *
 * Paid traffic gets no site nav: one page, one job, one exit. The only link
 * that is not the CTA is "Log in", because a returning buyer clicking their own
 * retargeting ad must not be made to sign up twice.
 */

export function LpHeader({ src }: { src: string }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-14 max-w-[1140px] items-center px-5 sm:h-16 sm:px-8">
        <Link href="/" aria-label="Nursia — home" className="flex items-center">
          <Wordmark />
        </Link>
        <span className="ml-auto flex items-center gap-5">
          <Link
            href="/login"
            className="text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
          >
            Log in
          </Link>
          <CtaLink src={src} className="btn btn-primary hidden !min-h-0 !py-2 !text-sm sm:inline-flex">
            Start free
          </CtaLink>
        </span>
      </div>
    </header>
  );
}

export function LpSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${className}`}>
      <div className="mx-auto max-w-[1140px] px-5 sm:px-8">{children}</div>
    </section>
  );
}

/** Four checkable numbers in a row. Mono, because every value in it is a fact. */
export function LpFacts({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
      {items.map((f) => (
        <div key={f.label} className="border-t-2 border-ink pt-3">
          <dt className="sr-only">{f.label}</dt>
          <dd>
            <p className="font-mono text-[1.5rem] font-medium leading-none tracking-[-0.03em] text-ink">
              {f.value}
            </p>
            <p className="mt-2 text-[0.875rem] font-semibold leading-snug tracking-[-0.01em] text-ink-2">
              {f.label}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LpCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
      <span aria-hidden className="mt-[2px] font-mono text-teal">
        ✓
      </span>
      {children}
    </li>
  );
}

export function LpCross({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted">
      <span aria-hidden className="mt-[2px] font-mono">
        ×
      </span>
      {children}
    </li>
  );
}

/** The closing dark band. Same words as the hero button, one screen later. */
export function LpClose({
  src,
  heading,
  sub,
  cta,
  note,
}: {
  src: string;
  heading: React.ReactNode;
  sub: string;
  cta: string;
  note: string;
}) {
  return (
    <section className="flowsheet mt-20 bg-ink text-white">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-end">
        <div className="max-w-xl">
          <h2 className="text-[2rem] leading-[1.08] sm:text-[2.5rem]">{heading}</h2>
          <p className="mt-4 font-body text-base leading-relaxed text-white/65">{sub}</p>
        </div>
        <div className="md:ml-auto md:shrink-0">
          <CtaLink src={src} className="btn btn-invert">
            {cta}
          </CtaLink>
          <p className="mt-3 font-mono text-[11px] text-white/45">{note}</p>
        </div>
      </div>
    </section>
  );
}
