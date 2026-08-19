import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { Wordmark } from "@/components/Wordmark";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Start free — 50 NCLEX questions, no card",
  description:
    "Make a free Nursia account with an email and a password. 50 NCLEX questions, full rationales, and your weak topics. No card, ever.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

const GET = ["50 questions", "Full rationales", "Your weak topics", "No card, ever"];

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
      {/* No nav — this page has one job. */}
      <header className="flex h-16 items-center">
        <Link href="/" aria-label="Nursia — home">
          <Wordmark />
        </Link>
        <Link
          href="/login"
          className="ml-auto text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
        >
          Log in
        </Link>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:py-16">
        <div className="max-w-md">
          <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.5rem]">
            Make an account, <span className="mark">start practising</span>
          </h1>
          <p className="mt-5 font-body text-[1.0625rem] leading-[1.65] text-ink-2">
            {SITE.freeQuestions} real NCLEX questions with full rationales, free and permanent —
            not a trial that quietly turns into a charge. We ask for an email and a password and
            nothing else.
          </p>

          <div className="mt-9 border-t border-rule pt-5">
            <p className="eyebrow">What you get, free</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {GET.map((g) => (
                <li key={g} className="flex gap-3 text-[0.9375rem] text-ink-2">
                  <span className="font-mono text-teal">✓</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 border-t border-rule pt-5">
            <p className="eyebrow">What we will not do</p>
            <p className="mt-3 font-mono text-[0.8125rem] leading-[1.9] text-ink-2">
              No card required
              <br />
              No auto-trial that charges you
              <br />
              Unsubscribe in one click
            </p>
          </div>

          {/* the escape hatch that keeps the gate from being a wall */}
          <div className="mt-8 rounded-sm border border-ink bg-paper-2 p-5">
            <p className="font-display text-[1rem] font-bold tracking-[-0.02em] text-ink">
              Not ready?
            </p>
            <Link
              href="/nclex-practice-questions"
              className="mt-2 inline-block font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
            >
              → 10 questions with no account, on the practice hub
            </Link>
          </div>
        </div>

        <div className="lg:pt-2">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
