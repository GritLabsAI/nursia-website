import { BreadcrumbSchema, Breadcrumbs, Section } from "@/components/Blocks";
import { SITE } from "@/lib/content";

export type LegalSection = { h2: string; body: string[] };

/**
 * Shared shell for the three legal pages. Plain language on purpose — a refund
 * policy nobody can read is functionally the same as not having one.
 */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  const trail = [{ label: "Home", href: "/" }, { label: title }];

  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <Section className="pt-10 pb-20">
        <div className="mx-auto max-w-2xl">
          <Breadcrumbs trail={trail} />
          <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.5rem]">{title}</h1>
          <p className="mt-3 font-mono text-[11px] text-muted">Last updated {SITE.updated}</p>
          <p className="mt-6 font-body text-[1.0625rem] leading-[1.68] text-ink-2">{intro}</p>

          <div className="prose-ns mt-10">
            {sections.map((s) => (
              <div key={s.h2}>
                <h2>{s.h2}</h2>
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ))}
          </div>

          <p className="mt-12 border-t border-rule pt-5 font-mono text-[11px] leading-relaxed text-muted">
            Questions about any of this go to{" "}
            <a href={`mailto:${SITE.email}`} className="text-ink underline underline-offset-4">
              {SITE.email}
            </a>
            . We answer within one business day.
          </p>
        </div>
      </Section>
    </>
  );
}
