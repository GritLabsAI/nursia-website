/**
 * Stage 10 — get the market into the store.
 *
 * Reads Keyword Planner exports and writes them to the shared `keyword` table.
 * Nothing here decides anything; it is the boundary between what Google says
 * and what this pipeline believes, and the only job at a boundary is to get
 * the data across without quietly changing it.
 *
 * Three things about the file format that are not obvious and cost an
 * afternoon each if you meet them by surprise:
 *
 * - **UTF-16LE, not UTF-8.** Read as UTF-8 it looks like every character is
 *   followed by a null, and a naive parser produces one column of mojibake
 *   rather than failing, so the run "succeeds" with nothing in it.
 * - **Tab-separated, despite the .csv.** Splitting on commas yields one field
 *   per row containing the whole line.
 * - **Two preamble lines before the header** — the report name and the date
 *   range. The date range is worth keeping: it is the only record of what
 *   period the volumes describe, and volumes from different windows are
 *   different measurements that must not be averaged together.
 *
 * Volumes may arrive as ranges ("1K – 10K") for accounts without meaningful
 * spend. Whatever comes back is parsed to a number and the source records
 * which file it came from, because a bucketed number ranks topics fine and
 * forecasts traffic not at all.
 *
 *   npm run nursing:ingest
 *   npm run nursing:ingest -- --dir ~/Downloads --glob "Keyword Stats*"
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { homedir } from "node:os";
import { openNursingStore, type KeywordFull } from "./lib/store";

const DIR = resolve(
  argOf("--dir") ?? process.env.KW_DIR ?? join(homedir(), "Downloads"),
);
const PATTERN = argOf("--glob") ?? "Keyword Stats";
const DRY = process.argv.includes("--dry");

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

type Parsed = {
  file: string;
  period: string;
  rows: KeywordFull[];
};

function main() {
  const files = readdirSync(DIR)
    .filter((f) => f.toLowerCase().includes(PATTERN.toLowerCase().replace(/\*/g, "")))
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .map((f) => join(DIR, f))
    .filter((f) => statSync(f).isFile());

  if (!files.length) {
    throw new Error(
      `No exports matching "${PATTERN}" in ${DIR}. Pass --dir to point at the ` +
        `folder Keyword Planner downloads into.`,
    );
  }

  console.log(`\nIngest`);
  console.log(`  dir     ${DIR}`);
  console.log(`  files   ${files.length}\n`);

  const parsed = files.map(parseExport);

  /*
   * One keyword can appear in several exports, measured over different
   * windows. Keeping the highest volume would bias towards whichever export
   * was run in the busiest season; keeping the newest is the honest choice —
   * it is the most recent thing Google said about the query — so rows are
   * merged newest-observation-wins, and the row carries the file it came from
   * so a surprising number can be traced back to the export that produced it.
   */
  const merged = new Map<string, KeywordFull>();
  for (const p of parsed) {
    for (const row of p.rows) {
      const prior = merged.get(row.keyword);
      if (!prior || row.observedAt >= prior.observedAt) merged.set(row.keyword, row);
    }
    console.log(
      `  ${String(p.rows.length).padStart(5)}  ${basename(p.file).padEnd(44)} ${p.period}`,
    );
  }

  const rows = [...merged.values()];
  const withVolume = rows.filter((r) => r.volume > 0);

  console.log(`\n  unique      ${rows.length}`);
  console.log(`  with volume ${withVolume.length}`);
  console.log(
    `  top         ${[...withVolume]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
      .map((r) => `${r.keyword} (${r.volume.toLocaleString()})`)
      .join(", ")}\n`,
  );

  if (DRY) {
    console.log("  dry run — nothing written\n");
    return;
  }

  const store = openNursingStore();
  store.putKeywords(rows);
  /* Counted through a committed read rather than from `rows.length`, so the
     number printed is what the database actually holds. The two diverged once,
     silently, and the run that reported 3,681 rows had written none. */
  const held = store.keywordCount();
  store.close();

  console.log(`  keyword table now holds ${held} rows\n`);
  if (held < rows.length) {
    console.warn(
      `  ! ${rows.length - held} rows did not persist — check the journal mode\n`,
    );
  }
}

/* ------------------------------------------------------------------ parse */

function parseExport(path: string): Parsed {
  const raw = readFileSync(path);
  const text = decode(raw);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);

  /* The header is the first line that contains a Keyword column, rather than
     line 3 by assumption — Google has moved the preamble before and will
     again, and an off-by-one here silently parses the date range as a row. */
  const headerIndex = lines.findIndex((l) => /^keyword\t/i.test(l));
  if (headerIndex === -1) {
    throw new Error(`${basename(path)}: no header row — is this a Keyword Planner export?`);
  }

  const period = lines.slice(0, headerIndex).at(-1)?.trim() ?? "unknown period";
  const header = lines[headerIndex].split("\t").map((h) => h.trim());
  const col = (name: string) =>
    header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iKeyword = col("Keyword");
  const iVolume = col("Avg. monthly searches");
  const iComp = col("Competition");
  const iCompIdx = col("Competition (indexed value)");
  const iLow = col("Top of page bid (low range)");
  const iHigh = col("Top of page bid (high range)");

  /* The twelve monthly columns, in file order. They are what a trajectory is
     computed from later, and they are the reason a seasonal query is not
     mistaken for a dying one. */
  const monthCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^searches:/i.test(h));

  const observedAt = periodEnd(period) ?? isoFromFilename(path);
  const source = `keyword-planner:${basename(path)}`;

  const rows: KeywordFull[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = line.split("\t");
    const keyword = (cells[iKeyword] ?? "").trim().toLowerCase();
    if (!keyword) continue;

    const monthly = monthCols
      .map(({ h, i }) => ({
        label: h.replace(/^searches:\s*/i, "").trim(),
        searches: num(cells[i]),
      }))
      .filter((m) => Number.isFinite(m.searches));

    rows.push({
      keyword,
      volume: num(cells[iVolume]) || 0,
      competition: (cells[iComp] ?? "").trim() || "Unknown",
      competitionIndex: num(cells[iCompIdx]) || 0,
      lowBid: num(cells[iLow]) || 0,
      highBid: num(cells[iHigh]) || 0,
      source,
      observedAt,
      monthly: monthly.length ? JSON.stringify(monthly) : null,
    });
  }

  return { file: path, period, rows };
}

/**
 * UTF-16LE with a BOM is what Keyword Planner actually writes, but the same
 * account has produced UTF-8 exports before. Sniff the BOM rather than
 * assuming: guessing wrong produces a file that parses to garbage instead of
 * throwing, which is the worst of the two failure modes.
 */
function decode(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").slice(1);
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf);
    swapped.swap16();
    return swapped.toString("utf16le").slice(1);
  }
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString("utf8").slice(1);
  }
  /* No BOM. A UTF-16LE body without one still shows as ASCII-then-null, which
     is unambiguous enough to detect from the first few bytes. */
  if (buf.length > 4 && buf[1] === 0x00 && buf[3] === 0x00) {
    return buf.toString("utf16le");
  }
  return buf.toString("utf8");
}

/**
 * "1,900" → 1900, "1K – 10K" → 10000, "--" → NaN.
 *
 * Ranges resolve to the top of the band on purpose. The number is used for
 * ranking which pages to write, and under-reading a 1K–10K keyword as 1,000
 * ranks it below an exact 1,300 that is genuinely smaller. Over-reading is the
 * cheaper mistake: the worst case is writing a good page slightly too early.
 */
function num(cell: string | undefined): number {
  if (cell == null) return NaN;
  const s = cell.trim();
  if (!s || s === "--" || s === "-" || s === '"') return NaN;

  const parts = s.split(/[–-]/).map((p) => p.trim()).filter(Boolean);
  const last = parts.at(-1) ?? s;
  const m = last.replace(/,/g, "").match(/^([\d.]+)\s*([KM])?/i);
  if (!m) return NaN;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return NaN;
  const mult = m[2]?.toUpperCase() === "M" ? 1e6 : m[2]?.toUpperCase() === "K" ? 1e3 : 1;
  return base * mult;
}

/** "1 August 2025 - 31 July 2026" → "2026-07-31". */
function periodEnd(period: string): string | null {
  const end = period.split(/\s+[-–]\s+/).at(-1)?.trim();
  if (!end) return null;
  const d = new Date(`${end} UTC`);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

/** "Keyword Stats 2026-09-11 at 20_54_16.csv" → "2026-09-11". */
function isoFromFilename(path: string): string {
  return (
    basename(path).match(/(\d{4}-\d{2}-\d{2})/)?.[1] ??
    new Date().toISOString().slice(0, 10)
  );
}

try {
  main();
} catch (err) {
  console.error(`\nIngest failed: ${(err as Error).message}\n`);
  process.exit(1);
}
