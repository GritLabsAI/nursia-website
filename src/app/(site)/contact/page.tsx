import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BreadcrumbSchema, Breadcrumbs, CtaBand, Section } from "@/components/Blocks";
import { ContactForm } from "@/components/ContactForm";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "Contact Nursia — we answer in one business day" },
  description:
    "Email us or use the form. We answer within one business day, and if you report a question that looks wrong we fix or remove it and write back.",
  alternates: { canonical: "/contact" },
};

const TRAIL = [{ label: "Home", href: "/" }, { label: "Contact" }];

/* Deflection: most tickets are these four, so they sit beside the form. */
const FASTER = [
  { label: "Refunds and cancelling", href: "/refunds" },
  { label: "Is it Next Gen?", href: "/guides/next-gen-changes-explained" },
  { label: "Billing and receipts", href: "/pricing#cancel" },
  { label: "Full FAQ", href: "/nclex-practice-questions#faq" },
];

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema trail={TRAIL} />

      <Section className="pt-10 pb-14">
        <Breadcrumbs trail={TRAIL} />
        <h1 className="max-w-2xl text-[2.25rem] leading-[1.04] sm:text-[3rem]">
          Talk to a person
        </h1>
        <p className="mt-6 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.1875rem]">
          We answer within one business day, every day of the week. That is a real promise rather
          than a marketing line — at our size a fast reply is the trust signal we have instead of
          reviews, so it is the one thing we are strict about.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Suspense
            fallback={<div className="h-96 rounded-sm border border-rule bg-white" />}
          >
            <ContactForm />
          </Suspense>

          <aside className="flex flex-col gap-8">
            <div>
              <p className="eyebrow">Faster answers</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {FASTER.map((f) => (
                  <li key={f.href}>
                    <Link
                      href={f.href}
                      className="text-[0.9375rem] text-ink-2 transition-colors hover:text-teal"
                    >
                      → {f.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-rule pt-5">
              <p className="eyebrow">Direct</p>
              <a
                href={`mailto:${SITE.email}`}
                className="mt-3 block font-mono text-[0.9375rem] text-ink underline underline-offset-4 transition-colors hover:text-teal"
              >
                {SITE.email}
              </a>
              <p className="mt-2 text-[0.8125rem] leading-snug text-muted">
                Hiding the address behind a form reads as a company avoiding you.
              </p>
              <div className="mt-4 flex gap-4">
                {["Instagram", "TikTok"].map((s) => (
                  <a
                    key={s}
                    href={`https://${s.toLowerCase()}.com/nursia`}
                    className="text-[0.8125rem] text-ink-2 underline decoration-rule underline-offset-4 hover:text-teal"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-ink bg-paper-2 p-5">
              <p className="font-display text-[1rem] font-bold tracking-[-0.02em] text-ink">
                Found a bad question?
              </p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">
                Send us the item ID — it is in the top-left of every question card. We fix or
                remove it and email you back to say which.
              </p>
              <Link
                href="/contact?about=question"
                className="mt-3 inline-block font-mono text-[11px] text-teal underline underline-offset-4 hover:text-teal-dark"
              >
                → Report a question
              </Link>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand
        heading="While you wait — try 10 questions."
        sub="The practice hub is ungated, so you can answer ten right now and see whether the reply is even worth waiting for."
      />
    </>
  );
}
