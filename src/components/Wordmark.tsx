/**
 * The wordmark stays quiet — the question card is where this site spends its
 * boldness. Lowercase, tight, one teal mark that reads as a chart annotation.
 */
export function Wordmark({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <span
      className={`font-display text-[1.375rem] font-bold tracking-[-0.045em] ${
        tone === "paper" ? "text-paper" : "text-ink"
      }`}
    >
      nursia
      <span className="text-teal" aria-hidden>
        .
      </span>
    </span>
  );
}
