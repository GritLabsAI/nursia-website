/**
 * Keyword Planner, driven through the UI.
 *
 * The API route is shut: `GenerateKeywordIdeas` needs a developer token with
 * Basic access and this one has explorer access, which Google refuses outright.
 * The web UI has no such gate — the same data, in the same account, that a
 * person can export by hand today. So this does what that person would do, once
 * per seed batch, and puts the result in the local store.
 *
 * Read-only: keyword research and a CSV export. It never touches campaigns,
 * budgets or bids, and it must not be extended to. The account it drives can
 * spend money.
 *
 *   npm run kw:signin           # once, to establish the session
 *   npm run kw:ideas            # harvest using pipeline/keywords/seeds.txt
 *   npm run kw:ideas -- --batch 8
 *
 * Two things about the data that matter more than the plumbing:
 *
 * - **The account defaults to India.** For an NCLEX site that is the wrong
 *   market entirely, and the failure is silent and convincing — the table fills
 *   with plausible keywords and plausible volumes that describe a country we do
 *   not sell into. Measured under India, "nclex practice questions" is 4,400 a
 *   month; under the United States it is 22,200. The location is set explicitly
 *   every run and the run *fails* if it cannot be.
 * - **The grid is virtualised.** Two seeds return 2,392 ideas and only the
 *   visible forty rows exist in the DOM, so scraping the table returns a sliver
 *   and gives no sign that it did. The export is the whole result set.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "playwright-core";
import { openAdsBrowser, selectAccount } from "./browser";
import { downloadIdeasCsv } from "./download";
import { setLocation } from "./location";
import { parseKeywordPlannerCsv } from "./parse-csv";
import { openStore } from "../lib/store";

const CUSTOMER = process.env.ADS_CUSTOMER ?? "6331825613";
const SEEDS_FILE = resolve(process.env.KW_SEEDS ?? "pipeline/keywords/seeds.txt");
const GEO = process.env.KW_GEO ?? "United States";
/* The UI accepts up to ten seeds per query. */
const BATCH = Math.min(10, Number(argOf("--batch") ?? 10));
const TODAY = new Date().toISOString().slice(0, 10);

function argOf(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const seeds = readFileSync(SEEDS_FILE, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (!seeds.length) throw new Error(`No seeds in ${SEEDS_FILE}`);

  const batches: string[][] = [];
  for (let i = 0; i < seeds.length; i += BATCH) {
    batches.push(seeds.slice(i, i + BATCH));
  }

  console.log(`\nKeyword Planner harvest`);
  console.log(`  seeds     ${seeds.length}`);
  console.log(`  batches   ${batches.length} of up to ${BATCH}`);
  console.log(`  market    ${GEO}`);
  console.log(`  account   ${CUSTOMER}\n`);

  const store = openStore();
  store.startRun(TODAY, "keywords", `${seeds.length} seeds`);

  let added = 0;

  /*
   * A fresh browser per batch.
   *
   * Google serves the export through a popup it closes immediately, and often
   * enough that takes the whole context down with it: the first batch succeeds,
   * every batch after it fails instantly with "Target page, context or browser
   * has been closed". Reusing one browser across eight batches turned a
   * forty-thousand-keyword harvest into a five-thousand-keyword one, and the
   * only visible symptom was seven identical error lines.
   *
   * Relaunching costs about twenty seconds a batch. The session lives in the
   * profile directory rather than in memory, so nothing has to be signed in
   * again — it is purely startup time, which is a cheap price for a run that
   * finishes.
   */
  for (const [i, batch] of batches.entries()) {
    const label = `batch-${String(i + 1).padStart(2, "0")}`;
    console.log(`  ${label}: ${batch.join(", ")}`);

    const ctx = await openAdsBrowser({ headless: false });
    try {
      const page = ctx.pages()[0] ?? (await ctx.newPage());
      await page.goto("https://ads.google.com/aw/keywordplanner/home", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(7000);
      await selectAccount(ctx, CUSTOMER);
      await page.waitForTimeout(5000);

      if (page.url().includes("/nav/selectaccount")) {
        throw new Error(`Stuck on the account chooser. Is ${CUSTOMER} visible to this login?`);
      }

      const file = await harvestBatch(page, page.url(), batch, label);
      const { rows, period, currency } = parseKeywordPlannerCsv(file, TODAY);
      assertRelevant(rows, batch, file);
      store.putKeywords(rows);
      added += rows.length;
      console.log(
        `    ${rows.length} ideas  (${period || "period unknown"}, bids in ${currency || "?"})`,
      );
    } catch (err) {
      /* A failed batch must not cost the batches that already worked — those
         are committed to SQLite by the time this runs. */
      console.log(`    failed: ${(err as Error).message.split("\n")[0]}`);
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  store.finishRun(TODAY, "keywords", `${added} rows`);
  console.log(`\n  ${store.counts().keyword ?? 0} unique keywords in the store\n`);
  store.close();
}

/** One pass of Discover new keywords. Returns the path to the exported CSV. */
async function harvestBatch(
  page: Page,
  home: string,
  seeds: string[],
  label: string,
): Promise<string> {
  /* Back to the account-scoped home each time. Navigating to the bare
     /keywordplanner/home would drop the ocid and land on the account chooser. */
  await page.goto(home, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(5000);

  await page.getByText("Discover new keywords", { exact: false }).first().click();
  await page.waitForTimeout(4000);

  await setLocation(page, GEO);

  const input = page.locator('input[aria-label="Search input"]').first();
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.click();
  for (const seed of seeds) {
    await input.type(seed, { delay: 20 });
    /* Enter turns the text into a chip. Without it only the last seed is
       submitted, which looks like a working run returning thin results. */
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
  }

  await page.getByRole("button", { name: /get results/i }).first().click();
  await page.waitForTimeout(12_000);

  return downloadIdeasCsv(page, label);
}

/**
 * Refuse an export that is not about what we asked for.
 *
 * This exists because it already happened. A run stored 3,681 keywords led by
 * "nism certification", "cfa level 1" and "cpa classes" — the other exam
 * businesses in the same Google account. The download control had picked up a
 * different export entirely, and nothing about the run looked wrong: it
 * reported a healthy row count and the numbers were real, they were just
 * answers to somebody else's question.
 *
 * The check is deliberately weak — one seed word appearing somewhere in the
 * results. A strong relevance filter would start throwing away legitimate
 * lateral ideas, which are half the value of keyword expansion. This is only
 * here to catch the case where the file is about a different subject entirely.
 */
function assertRelevant(
  rows: { keyword: string }[],
  seeds: string[],
  file: string,
) {
  if (!rows.length) throw new Error(`Export was empty (${file})`);

  const words = new Set(
    seeds
      .flatMap((s) => s.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 3),
  );

  const hits = rows.filter((r) => {
    const k = r.keyword.toLowerCase();
    for (const w of words) if (k.includes(w)) return true;
    return false;
  }).length;

  const share = hits / rows.length;
  if (share < 0.2) {
    throw new Error(
      `Export does not match the seeds — only ${Math.round(share * 100)}% of ` +
        `${rows.length} rows mention any seed word. Top row: "${rows[0].keyword}". ` +
        `This is usually the wrong download (another product's keyword list). ` +
        `Kept at ${file} for inspection; nothing was stored.`,
    );
  }
}

main().catch((err) => {
  console.error(`\nHarvest failed: ${err.message}\n`);
  process.exit(1);
});
