/**
 * Stage 20 — get the keyword export into the store.
 *
 * The boundary between what the export claims and what this pipeline believes.
 * The only job at a boundary is to get the data across without quietly changing
 * it, so nothing here scores, filters or rewrites: a row goes in and a row comes
 * out, with the file it came from recorded next to it.
 *
 * The file is ordinary UTF-8 comma-separated text with a header row — unlike the
 * Keyword Planner exports the guide pipeline reads, which are UTF-16LE and
 * tab-separated despite the extension. It does contain quoted fields with commas
 * inside them ("NCLEX ABCs (Airway, Breathing, Circulation) strategy"), so it is
 * parsed properly rather than split on commas. Splitting on commas here does not
 * throw; it silently shifts every column right for those rows, which surfaces
 * three stages later as a page filed under the category "Breathing".
 *
 *   npm run nclex:ingest
 *   npm run nclex:ingest -- --dry
 *   npm run nclex:ingest -- --file pipeline/nclex/data/other-export.csv
 */

import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { openStore, type KeywordRow } from "./lib/store";

const DRY = process.argv.includes("--dry");
const FILE = resolve(
  argOf("--file") ??
    process.env.NCLEX_CSV ??
    "pipeline/nclex/data/nclex_seo_topics_1000.csv",
);

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** The columns this stage requires. A missing one stops the run. */
const REQUIRED = [
  "topic",
  "category",
  "search_intent",
  "difficulty",
  "est_monthly_searches",
  "keyword_difficulty",
  "cpc_usd",
  "conversion_potential",
  "recommended_content_type",
];

function main() {
  let raw: string;
  try {
    statSync(FILE);
    raw = readFileSync(FILE, "utf8");
  } catch {
    throw new Error(
      `No export at ${FILE}. Put the keyword CSV there, or pass --file.`,
    );
  }

  const rows = parseCsv(raw);
  if (!rows.length) throw new Error(`${basename(FILE)} has a header and no rows.`);

  const missing = REQUIRED.filter((c) => !(c in rows[0]));
  if (missing.length) {
    throw new Error(
      `${basename(FILE)} is missing ${missing.join(", ")}. Columns found: ` +
        Object.keys(rows[0]).join(", "),
    );
  }

  const observedAt = new Date().toISOString().slice(0, 10);
  const source = `csv:${basename(FILE)}`;

  /*
   * The same query can appear twice in one export — "Stress Management for
   * NCLEX" is filed under both Health Promotion and Psychosocial Integrity, and
   * "NCLEX Hospice practice questions with rationales" appears twice outright.
   * Keeping the higher volume would be a quiet vote for whichever duplicate was
   * more optimistic; keeping the first occurrence is arbitrary but honest, and
   * the count of collisions is printed so a file full of them is visible rather
   * than absorbed.
   */
  const seen = new Map<string, KeywordRow>();
  let duplicates = 0;

  for (const r of rows) {
    const keyword = r.topic?.trim();
    if (!keyword) continue;
    if (seen.has(keyword)) {
      duplicates++;
      continue;
    }
    seen.set(keyword, {
      keyword,
      category: r.category?.trim() ?? "",
      intent: r.search_intent?.trim() ?? "",
      difficulty: r.difficulty?.trim() ?? "",
      volume: toInt(r.est_monthly_searches),
      keywordDifficulty: toInt(r.keyword_difficulty),
      cpc: toFloat(r.cpc_usd),
      conversionPotential: r.conversion_potential?.trim() ?? "",
      contentType: r.recommended_content_type?.trim() ?? "",
      source,
      observedAt,
    });
  }

  const keywords = [...seen.values()];
  const byCategory = new Map<string, number>();
  for (const k of keywords) {
    byCategory.set(k.category, (byCategory.get(k.category) ?? 0) + 1);
  }

  console.log(`\nIngest`);
  console.log(`  file        ${FILE}`);
  console.log(`  rows        ${rows.length}`);
  console.log(`  keywords    ${keywords.length}${duplicates ? ` (${duplicates} duplicate queries dropped)` : ""}`);
  console.log(`  categories  ${byCategory.size}`);
  console.log(
    `  volume      ${keywords.reduce((n, k) => n + k.volume, 0).toLocaleString()} searches/month claimed\n`,
  );

  for (const [category, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${category}`);
  }

  if (DRY) {
    console.log(`\n  --dry, nothing written\n`);
    return;
  }

  const store = openStore();
  try {
    store.startRun(observedAt, "ingest", source);
    store.putKeywords(keywords);
    store.finishRun(observedAt, "ingest", `${keywords.length} keywords`);
    console.log(`\n  stored      ${JSON.stringify(store.counts())}\n`);
  } finally {
    store.close();
  }
}

/* ----------------------------------------------------------------- parsing */

/**
 * RFC 4180 enough for this file: quoted fields, doubled quotes inside them,
 * and CRLF or LF line endings. Deliberately not a dependency — a hundred lines
 * of well-understood parsing beats a transitive tree on a script that runs four
 * times a year.
 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      /* A bare \r is a line ending too; \r\n must not produce a blank row. */
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.length)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.length)) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];

  const columns = header.map((h) => h.trim().replace(/^﻿/, ""));
  return body.map((cells) =>
    Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? ""])),
  );
}

/** Volumes may arrive bucketed ("1K – 10K") from accounts without spend. */
function toInt(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[, ]/g, "");
  const k = /^(\d+(?:\.\d+)?)K/i.exec(cleaned);
  if (k) return Math.round(Number(k[1]) * 1000);
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function toFloat(value: string | undefined): number {
  const n = Number.parseFloat((value ?? "").replace(/[$, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

try {
  main();
} catch (err) {
  console.error(`\nIngest failed: ${(err as Error).message}\n`);
  process.exit(1);
}
