import { readFileSync } from "node:fs";
import type { KeywordRow } from "../lib/store";

/**
 * Parse a Keyword Planner export.
 *
 * Three things about this file that are not obvious and each of which silently
 * produces garbage if missed:
 *
 * - It is **UTF-16LE**, not UTF-8. Read as UTF-8 it comes back as text
 *   interleaved with NUL bytes, which still splits into lines and still looks
 *   vaguely like data.
 * - It is **tab-separated**, despite the .csv extension.
 * - The first two lines are a title and the date range. The header row is the
 *   third line, so anything that assumes line 0 is the header parses the title
 *   as column names and every row as a mismatch.
 *
 * Columns are found by header name rather than position, because Google adds
 * and reorders them between accounts and over time.
 */

export type ParsedExport = {
  rows: KeywordRow[];
  /** The date range the file covers, as Google states it. */
  period: string;
  currency: string;
};

export function parseKeywordPlannerCsv(
  path: string,
  observedAt: string,
): ParsedExport {
  const text = readFileSync(path, "utf16le").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const headerIndex = lines.findIndex((l) => /^Keyword\t/i.test(l));
  if (headerIndex === -1) {
    throw new Error(`No header row in ${path} — is it a Keyword Planner export?`);
  }

  const period = lines[1]?.trim() ?? "";
  const header = lines[headerIndex].split("\t").map((h) => h.trim());

  const col = (...names: string[]) => {
    for (const name of names) {
      const i = header.findIndex(
        (h) => h.toLowerCase() === name.toLowerCase(),
      );
      if (i !== -1) return i;
    }
    return -1;
  };

  const iKeyword = col("Keyword");
  const iCurrency = col("Currency");
  const iVolume = col("Avg. monthly searches");
  const iComp = col("Competition");
  const iCompIdx = col("Competition (indexed value)");
  const iLow = col("Top of page bid (low range)");
  const iHigh = col("Top of page bid (high range)");

  if (iKeyword === -1 || iVolume === -1) {
    throw new Error(
      `Export is missing Keyword or Avg. monthly searches. Header: ${header.join(" | ")}`,
    );
  }

  /* The trailing unlabelled columns are the month-by-month series. Google emits
     them after the named columns with blank headers, so they are identified by
     position after the last named column rather than by name. */
  const lastNamed = Math.max(iKeyword, iCurrency, iVolume, iComp, iCompIdx, iLow, iHigh);

  const rows: KeywordRow[] = [];
  let currency = "";

  for (const line of lines.slice(headerIndex + 1)) {
    const cells = line.split("\t");
    const keyword = (cells[iKeyword] ?? "").trim();
    if (!keyword) continue;

    currency ||= (cells[iCurrency] ?? "").trim();

    const monthly = cells
      .slice(lastNamed + 1)
      .map((c) => Number(c.replace(/[,\s]/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);

    rows.push({
      keyword,
      volume: num(cells[iVolume]),
      competition: (cells[iComp] ?? "").trim().toUpperCase() || "UNKNOWN",
      competitionIndex: num(cells[iCompIdx]),
      lowBid: num(cells[iLow]),
      highBid: num(cells[iHigh]),
      source: "keyword-planner-ui",
      observedAt,
      monthly: monthly.length ? JSON.stringify(monthly) : null,
    });
  }

  return { rows, period, currency };
}

function num(cell: string | undefined): number {
  if (!cell) return 0;
  const n = Number(cell.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
