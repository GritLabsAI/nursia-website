"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TopicIcon } from "@/components/TopicIcon";
import { TopicDrill, type DrillTopic } from "@/components/practice/TopicDrill";
import { BANK_LOADERS } from "@/lib/bank/loaders";
import type { BankQuestion } from "@/lib/bank/types";

export type PracticeShelf = {
  title: string;
  note: string;
  topics: (DrillTopic & { count: number })[];
};

/**
 * The chooser from the practice mockup: shelves of topic tiles, and the set
 * opening in place underneath rather than on another page. Each set is a
 * separate chunk, so picking a topic downloads that topic and nothing else.
 */
export function TopicPractice({ shelves }: { shelves: PracticeShelf[] }) {
  const [active, setActive] = useState<DrillTopic | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  /** which load is current — a fast second click must not be overwritten */
  const token = useRef(0);

  async function open(topic: DrillTopic) {
    const mine = ++token.current;
    setActive(topic);
    setQuestions(null);
    setFailed(false);

    const load = BANK_LOADERS[topic.slug];
    if (!load) {
      setFailed(true);
      return;
    }
    try {
      const qs = await load();
      if (token.current === mine) setQuestions(qs);
    } catch {
      if (token.current === mine) setFailed(true);
    }
  }

  function close() {
    token.current++;
    setActive(null);
    setQuestions(null);
    setFailed(false);
  }

  /* Bring the set to the top of the viewport, clear of the sticky header, the
     way the mockup does — otherwise the question opens below the fold. */
  useEffect(() => {
    if (!active || !slot.current) return;
    const top = slot.current.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [active]);

  return (
    <div>
      {shelves.map((shelf) => (
        <section key={shelf.title} className="mt-12 first:mt-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-3">
            <h2 className="eyebrow">{shelf.title}</h2>
            <p className="font-mono text-[11px] text-muted">{shelf.note}</p>
          </div>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shelf.topics.map((t) => {
              const on = active?.slug === t.slug;
              return (
                <li key={t.slug} className="flex">
                  <button
                    type="button"
                    onClick={() => (on ? close() : open(t))}
                    aria-expanded={on}
                    className={`cell flex w-full flex-col items-start gap-2.5 text-left transition-colors ${
                      on ? "!border-ink bg-paper-2" : "hover:border-ink"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-sm border ${
                        on ? "border-teal bg-teal text-white" : "border-rule bg-paper text-teal"
                      }`}
                    >
                      <TopicIcon name={t.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-display text-[0.9375rem] font-bold leading-snug tracking-[-0.02em] text-ink">
                      {t.name}
                    </span>
                    <span className="mt-auto font-mono text-[11px] text-teal">
                      {on ? "open ↓" : `${t.count} questions →`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* the set expands here, pushing the page down rather than replacing it */}
      <div ref={slot} className="mt-8 scroll-mt-24">
        {active && (
          <div className="reveal">
            {questions ? (
              <>
                <TopicDrill topic={active} questions={questions} onClose={close} />
                <p className="mt-3 text-center font-mono text-[11px] text-muted">
                  Want the write-up as well?{" "}
                  <Link
                    href={`/nclex-practice-questions/${active.slug}`}
                    className="text-teal underline underline-offset-4 hover:text-teal-dark"
                  >
                    {active.name} topic page →
                  </Link>
                </p>
              </>
            ) : (
              <div className="qcard px-5 py-10 text-center sm:px-7">
                {failed ? (
                  <>
                    <p className="font-mono text-[0.8125rem] text-wrong">
                      That set did not load.
                    </p>
                    <button
                      type="button"
                      className="btn btn-ghost mt-4"
                      onClick={() => open(active)}
                    >
                      Try again
                    </button>
                  </>
                ) : (
                  <p className="font-mono text-[0.8125rem] text-muted">
                    Loading {active.name.toLowerCase()}…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room below, so the set can always scroll flush to the top of the
          viewport even when the last shelf is short. */}
      {active && <div className="h-[40vh]" aria-hidden />}
    </div>
  );
}
