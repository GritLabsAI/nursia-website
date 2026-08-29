"use client";

import { useState } from "react";

/**
 * The on-screen calculator the real exam gives you. Four functions and a
 * decimal point — the same thing Pearson VUE puts in the corner of the screen,
 * and the reason dosage items are fair game under a clock.
 *
 * Deliberately not a scientific calculator: having more here than the exam
 * gives would teach the wrong habit.
 */

const KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "−"],
  ["0", ".", "=", "+"],
] as const;

type Op = "÷" | "×" | "−" | "+";

const apply = (a: number, b: number, op: Op) =>
  op === "÷" ? (b === 0 ? NaN : a / b) : op === "×" ? a * b : op === "−" ? a - b : a + b;

/** Trim float noise — 0.1 + 0.2 should read 0.3 on a calculator face. */
const show = (n: number) =>
  !Number.isFinite(n) ? "Error" : String(Math.round(n * 1e10) / 1e10);

export function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [pending, setPending] = useState<{ value: number; op: Op } | null>(null);
  /** the next digit starts a new number rather than appending */
  const [fresh, setFresh] = useState(true);

  function digit(d: string) {
    if (d === "." && !fresh && display.includes(".")) return;
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
      return;
    }
    setDisplay(display === "0" && d !== "." ? d : display + d);
  }

  function operate(op: Op) {
    const current = Number(display);
    const value = pending ? apply(pending.value, current, pending.op) : current;
    setDisplay(show(value));
    setPending({ value, op });
    setFresh(true);
  }

  function equals() {
    if (!pending) return;
    setDisplay(show(apply(pending.value, Number(display), pending.op)));
    setPending(null);
    setFresh(true);
  }

  function clear() {
    setDisplay("0");
    setPending(null);
    setFresh(true);
  }

  return (
    <div className="w-[15rem] rounded-sm border border-ink bg-white p-3 shadow-[0_18px_40px_-24px_rgba(20,22,26,0.6)]">
      <div className="flex items-center gap-2">
        <p className="eyebrow !text-ink">Calculator</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the calculator"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm text-muted transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <output className="mt-2 block overflow-x-auto rounded-sm border border-rule bg-paper px-3 py-2.5 text-right font-mono text-[1.375rem] leading-none text-ink">
        {display}
      </output>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <button type="button" onClick={clear} className="calc-key col-span-4 !text-[0.8125rem]">
          Clear
        </button>
        {KEYS.flat().map((k) => (
          <button
            key={k}
            type="button"
            className="calc-key"
            onClick={() =>
              k === "=" ? equals() : "÷×−+".includes(k) ? operate(k as Op) : digit(k)
            }
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
