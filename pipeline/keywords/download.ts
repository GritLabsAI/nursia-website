import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { DOWNLOAD_DIR } from "./browser";

/**
 * Export the ideas table as CSV.
 *
 * Reading the rendered table is not an option at this scale. Two seed keywords
 * already produce 2,392 ideas and the grid is virtualised — only the visible
 * forty or so rows exist in the DOM at any moment, so scraping it returns a
 * sliver and gives no hint that it did. The export is the whole result set.
 *
 * The sequence below is exact and was arrived at by breaking it several times.
 * Three details are load-bearing:
 *
 * - The **trigger must be filtered to the visible one**. Angular Material keeps
 *   detached copies of trigger buttons in the DOM, so `.first()` picks a hidden
 *   one and then waits for something that will never appear.
 * - The **menu item must not be**. The `.csv` entry lives in an overlay that
 *   Playwright's visibility check does not agree is visible at the moment it is
 *   queried; filtering on it matches nothing, nothing gets clicked, and the run
 *   waits out the full download timeout having never started one.
 * - The **listener is registered between the two clicks**. Registering before
 *   the trigger picks up a stale download from the previous batch; registering
 *   after the menu click can miss a fast one.
 */
export async function downloadIdeasCsv(page: Page, label: string): Promise<string> {
  const trigger = page
    .locator("button, [role=button], material-button")
    .filter({ hasText: /file_download|download/i })
    .locator("visible=true")
    .first();

  await trigger.waitFor({ state: "visible", timeout: 30_000 });
  await trigger.click();
  await page.waitForTimeout(1800);

  const csvItem = page
    .locator("material-list-item, [role=menuitem], [role=option], button")
    .filter({ hasText: /\.csv|csv/i })
    .first();

  const waitForDownload = page.waitForEvent("download", { timeout: 120_000 });

  if (await csvItem.isVisible().catch(() => false)) {
    await csvItem.click();
  }

  const download = await waitForDownload;
  const target = join(DOWNLOAD_DIR, `${label}-${Date.now()}.csv`);

  /*
   * Fetch the export ourselves rather than asking Playwright for the file.
   *
   * Google serves this download through a popup that it closes the instant the
   * transfer starts. Playwright ties a Download to the page that began it, so
   * once that popup is gone both `saveAs()` and `path()` fail with "Target
   * page, context or browser has been closed" — even though the request itself
   * was perfectly fine.
   *
   * The URL is a normal authenticated https endpoint, so re-requesting it
   * through the context's request client — same cookies, same session, no page
   * involved — sidesteps the whole problem.
   */
  const url = download.url();
  if (url.startsWith("http")) {
    const res = await page.context().request.get(url);
    if (res.ok()) {
      await writeFile(target, await res.body());
      return target;
    }
  }

  /* Blob URL, or the refetch was rejected. Fall back to Playwright's own copy,
     which works whenever the originating page is still alive. */
  await download.saveAs(target).catch(async (err) => {
    const temp = await download.path();
    if (!temp) throw err;
    await copyFile(temp, target);
  });

  return target;
}
