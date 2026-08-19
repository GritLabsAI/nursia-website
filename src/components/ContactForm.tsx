"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const TOPICS = [
  { id: "billing", label: "Billing" },
  { id: "question", label: "A question looks wrong" },
  { id: "bug", label: "Bug" },
  { id: "partnership", label: "Partnership" },
  { id: "other", label: "Something else" },
];

export function ContactForm() {
  const params = useSearchParams();
  const [about, setAbout] = useState(params.get("about") ?? "");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  /* Success replaces the form in place — never a dead-end thank-you page. */
  if (sent) {
    return (
      <div className="reveal rounded-sm border-2 border-ink bg-white p-7">
        <p className="eyebrow !text-teal">Message sent</p>
        <h2 className="mt-3 text-[1.5rem]">Got it. We will reply by tomorrow.</h2>
        <p className="mt-3 font-body text-[0.9375rem] leading-relaxed text-ink-2">
          Going to <span className="font-mono text-ink">{email}</span>, within one business day.
          If it is about a question that looks wrong, we will tell you what we changed.
        </p>
        <Link href="/signup" className="btn btn-primary mt-6">
          While you wait — try it free →
        </Link>
      </div>
    );
  }

  return (
    <form
      className="rounded-sm border border-rule bg-white p-7"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Name</span>
          <input
            required
            name="name"
            autoComplete="name"
            className="min-h-11 rounded-sm border border-rule bg-paper px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-teal"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-sm border border-rule bg-paper px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-teal"
          />
        </label>

        {/* chips, not a dropdown — one tap, and it routes the ticket */}
        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">What is this about?</legend>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAbout(t.id)}
                aria-pressed={about === t.id}
                className={`min-h-11 rounded-sm border px-3.5 py-2 text-[0.875rem] font-medium transition-colors ${
                  about === t.id
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-ink-2 hover:border-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Message</span>
          <textarea
            required
            name="message"
            rows={5}
            className="rounded-sm border border-rule bg-paper px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus:border-teal"
          />
        </label>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="submit" className="btn btn-primary">
            Send message
          </button>
          <span className="font-mono text-[11px] text-muted">
            No captcha · we do not add you to a list
          </span>
        </div>
      </div>
    </form>
  );
}
