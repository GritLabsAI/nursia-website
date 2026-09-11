"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDays, listMissed, streakOf } from "@/lib/attempts";
import { accuracy, readStats, weakest, type Stats } from "@/lib/stats";
import { BLUEPRINT } from "@/lib/exam";
import { TOPICS } from "@/lib/content";

/**
 * The running totals, on the hub.
 *
 * Collecting this and never showing it would be the worst of both: the cost of
 * the writes and none of the use. Three numbers and a weakest-topic line is
 * about the right amount — enough to know whether the hours are working,
 * short of a dashboard nobody asked for.
 *
 * Renders nothing at all until there is something to say. A row of zeroes on
 * the first visit tells a new account that it has done nothing, which it
 * already knows.
 */

/** Blueprint keys and topic slugs share one map, so both need a display name. */
function nameFor(key: string): string {
  const category = BLUEPRINT.find((c) => c.key === key);
  if (category) return category.name;
  return TOPICS.find((t) => t.slug === key)?.name ?? key;
}

export function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState(0);

  useEffect(() => {
    let live = true;
    void readStats().then((s) => live && setStats(s));
    /* Two small reads on top of the summary: a day per document for the
       streak, and the review list only far enough to count it. Both are
       skipped entirely for an account that has answered nothing, because the
       strip renders nothing in that case anyway. */
    void listDays().then((d) => live && setStreak(streakOf(d)));
    void listMissed(50).then((m) => live && setMissed(m.length));
    return () => {
      live = false;
    };
  }, []);

  if (!stats || stats.answered === 0) return null;

  const pct = accuracy(stats);
  const weak = weakest(stats)[0];

  return (
    <div className="mt-9 border-y border-rule py-5">
      <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
        <Figure value={String(stats.answered)} label="questions answered" />
        <Figure value={pct === null ? "—" : `${pct}%`} label="answered correctly" />
        {stats.examsFinished > 0 && (
          <Figure
            value={`${stats.bestPct}%`}
            label={stats.examsFinished === 1 ? "on your exam" : `best of ${stats.examsFinished} exams`}
          />
        )}
        {/* Only once it is a run. "1 day" is not a streak, it is today. */}
        {streak > 1 && <Figure value={String(streak)} label="days in a row" />}

        {missed > 0 && (
          <p className="w-full text-[0.875rem] leading-relaxed text-ink-2 sm:w-auto">
            <Link
              href="/practice"
              className="font-semibold text-ink underline decoration-rule underline-offset-4 hover:text-teal"
            >
              {missed} to review
            </Link>{" "}
            <span className="font-mono text-[11px] text-muted">
              questions you got wrong last time
            </span>
          </p>
        )}

        {weak && (
          <p className="ml-auto max-w-sm text-[0.875rem] leading-relaxed text-ink-2">
            Weakest so far:{" "}
            <Link
              href="/practice"
              className="font-semibold text-ink underline decoration-rule underline-offset-4 hover:text-teal"
            >
              {nameFor(weak.key)}
            </Link>{" "}
            <span className="font-mono text-[11px] text-muted">
              {weak.correct}/{weak.answered} · {weak.pct}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-[1.75rem] leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
    </div>
  );
}
