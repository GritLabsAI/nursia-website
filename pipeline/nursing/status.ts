/**
 * Where the run is, without stopping it.
 *
 * Safe to run against a batch that is still writing — it opens the store and
 * reads, which WAL permits alongside the writer. That is the whole reason it
 * exists: over a three-hour run the alternative is tailing a log that Node
 * buffers when stdout is not a terminal, which means the last thing you see is
 * ten minutes old and the run looks hung when it is fine.
 *
 *   npm run nursing:status
 *   npm run nursing:status -- --failures    # what went wrong and how often
 */

import { openNursingStore } from "./lib/store";

const SHOW_FAILURES = process.argv.includes("--failures");

function bar(done: number, total: number, width = 34): string {
  if (!total) return "";
  const filled = Math.round((done / total) * width);
  return `${"█".repeat(filled)}${"·".repeat(width - filled)}`;
}

function main() {
  const store = openNursingStore();
  const counts = store.counts();

  const planned = counts["plan:planned"] ?? 0;
  const writing = counts["plan:writing"] ?? 0;
  const written = counts["plan:written"] ?? 0;
  const published = counts["plan:published"] ?? 0;
  const failed = counts["plan:failed"] ?? 0;
  const rejected = counts["plan:rejected"] ?? 0;

  /* `rejected` is out of the denominator: those are rows an earlier plan chose
     and a later one dropped, so counting them makes the run look permanently
     incomplete. The live total is what this plan actually asked for. */
  const total = planned + writing + written + published + failed;
  const done = written + published;

  console.log(`\nNursing library — ${done} of ${total}`);
  console.log(`  ${bar(done, total)}  ${total ? Math.round((done / total) * 100) : 0}%\n`);
  console.log(`  written      ${String(written).padStart(5)}`);
  console.log(`  published    ${String(published).padStart(5)}`);
  console.log(`  in flight    ${String(writing).padStart(5)}`);
  console.log(`  queued       ${String(planned).padStart(5)}`);
  console.log(`  failed       ${String(failed).padStart(5)}${failed ? "  (re-run to retry)" : ""}`);
  if (rejected) console.log(`  retired      ${String(rejected).padStart(5)}  (dropped by a later plan)`);

  const pages = store.pages();
  if (pages.length) {
    const words = pages.reduce((n, p) => n + p.words, 0);
    const held = pages.filter((p) => p.status === "rejected");
    console.log(`\n  ${pages.length} pages hold ${words.toLocaleString()} words`);
    console.log(`  median ${median(pages.map((p) => p.words))} words a page`);

    const families = new Map<string, number>();
    for (const p of pages) families.set(p.family, (families.get(p.family) ?? 0) + 1);
    console.log(
      `  ${[...families].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${n}`).join(", ")}`,
    );

    if (held.length) {
      console.log(`\n  ${held.length} held back by the quality gate:`);
      const reasons = new Map<string, number>();
      for (const p of held) {
        /* Grouped by the *kind* of problem rather than the exact message —
           "412 words, needs 520" and "466 words, needs 520" are one issue and
           listing them separately hides how common it is. */
        for (const issue of (p.error ?? "").split("; ")) {
          const kind = issue
            .replace(/^\d+ words.*/, "too short")
            .replace(/^\d+ sections.*/, "too few sections")
            .replace(/^short answer.*/, "short answer wrong length")
            .replace(/^\d+% overlap with .*/, "duplicate of another page")
            .replace(/^banned phrasing:.*/, "banned phrasing")
            .replace(/^\d+ section\(s\).*/, "a section under 40 words");
          if (kind) reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
        }
      }
      for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${String(n).padStart(4)}  ${r}`);
      }
      if (SHOW_FAILURES) {
        console.log();
        for (const p of held.slice(0, 20)) {
          console.log(`    ${p.slug.padEnd(46)} ${p.error}`);
        }
      }
    }
  }

  console.log();
  store.close();
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

main();
