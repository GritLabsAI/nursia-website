import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { FunnelHeader } from "@/components/FunnelHeader";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Start free — 50 NCLEX questions, no card",
  description:
    "Make a free Nursia account with an email and a password. 50 NCLEX questions, full rationales, and your weak topics. No card, ever.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

const GET = ["50 questions", "Full rationales", "Your weak topics", "No card, ever"];
const WONT = ["No card required", "No auto-trial that charges you", "Unsubscribe in one click"];

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
      <FunnelHeader altHref="/login" altLabel="Log in" />

      {/*
        Mobile order is the whole point: heading, then the form, then the
        reassurance. The proof used to sit between the promise and the fields,
        which put the password a full screen below the fold.
      */}
      <div className="grid gap-10 pb-16 pt-7 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-10 lg:pt-14">
        <div className="lg:col-start-1 lg:row-start-1 lg:max-w-md">
          <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2.25rem] lg:text-[2.5rem]">
            Make an account, <span className="mark">start practising</span>
          </h1>
          <p className="mt-4 font-body text-[1.0625rem] leading-[1.6] text-ink-2">
            {SITE.freeQuestions} real NCLEX questions with full rationales, free and permanent —
            <span className="hidden sm:inline">
              {" "}
              not a trial that quietly turns into a charge. We ask for an email and a password and
              nothing else.
            </span>
            <span className="sm:hidden"> no card, no trial that turns into a charge.</span>
          </p>

          {/* On a phone this is the only proof that runs above the fields. */}
          <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2 lg:hidden">
            {GET.map((g) => (
              <li
                key={g}
                className="rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-mono text-[11px] text-ink-2"
              >
                {g}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2">
          <SignupForm />
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:max-w-md">
          <div className="hidden border-t border-rule pt-5 lg:block">
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

          <div className="border-t border-rule pt-5 lg:mt-8">
            <p className="eyebrow">What we will not do</p>
            <ul className="mt-3 flex flex-col gap-2">
              {WONT.map((w) => (
                <li key={w} className="flex gap-2.5 font-mono text-[0.8125rem] text-ink-2">
                  <span aria-hidden className="text-muted">
                    ×
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          </div>

          {/* the escape hatch that keeps the gate from being a wall */}
          <div className="mt-7 rounded-sm border border-ink bg-paper-2 p-5">
            <p className="font-display text-[1rem] font-bold tracking-[-0.02em] text-ink">
              Not ready?
            </p>
            <Link
              href="/nclex-practice-questions"
              className="mt-2 inline-block font-mono text-[0.8125rem] leading-relaxed text-teal underline underline-offset-4 hover:text-teal-dark"
            >
              → 10 questions with no account, on the practice hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
