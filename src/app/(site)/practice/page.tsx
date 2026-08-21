import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/Blocks";
import { TopicPractice, type PracticeShelf } from "@/components/practice/TopicPractice";
import { BANK_COUNTS } from "@/lib/bank/counts";
import { SITE, topicsIn, type Topic } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "Practice NCLEX Questions by Topic | Nursia" },
  description:
    "Pick a topic and answer a full set in place — every NCSBN category and twelve clinical subjects, each with rationales on all four options. No account needed.",
  alternates: { canonical: "/practice" },
};

const tile = (t: Topic) => ({
  slug: t.slug,
  name: t.name,
  icon: t.icon,
  category: t.category,
  count: BANK_COUNTS[t.slug] ?? 0,
});

/* Only topics that actually have a set behind them get a tile — SATA is a
   format with no bank of its own and lives on its own page. */
const SHELVES: PracticeShelf[] = [
  {
    title: "NCLEX client needs",
    note: "Mapped to the official NCSBN test-plan categories",
    topics: topicsIn("category").map(tile).filter((t) => t.count > 0),
  },
  {
    title: "Clinical subjects",
    note: "The same bank, by body system and specialty",
    topics: topicsIn("subject").map(tile).filter((t) => t.count > 0),
  },
];

const TOTAL = SHELVES.reduce((n, s) => n + s.topics.reduce((m, t) => m + t.count, 0), 0);

export default function PracticePage() {
  return (
    <Section className="pt-10 pb-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-[2.125rem] leading-[1.05] sm:text-[2.75rem]">
          Pick a topic to <span className="mark">practise</span>
        </h1>
        <p className="mt-5 max-w-2xl font-body text-[1.0625rem] leading-[1.68] text-ink-2 sm:text-[1.125rem]">
          {TOTAL} questions, open right here with no account. Every set runs the same way: answer,
          check, and read a line on each of the four options saying why it wins or loses — then a
          scored review of the whole set at the end.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-rule py-3.5">
          <span className="font-mono text-[11px] text-muted">
            {SITE.updated} · reviewed by nurses
          </span>
          <Link
            href="/nclex-practice-questions"
            className="ml-auto font-mono text-[11px] text-teal underline underline-offset-4 hover:text-teal-dark"
          >
            The written topic guides →
          </Link>
        </div>

        <div className="mt-10">
          <TopicPractice shelves={SHELVES} />
        </div>
      </div>
    </Section>
  );
}
