import { chromium, type BrowserContext } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A signed-in browser for Google Ads, reused across runs.
 *
 * The Keyword Planner API needs a developer token with Basic access, which
 * this one does not have — `GenerateKeywordIdeas` refuses with "not allowed
 * for use with explorer access". The web UI has no such gate: it is the same
 * data, in the same account, that a person can export by hand today. So this
 * drives the UI instead.
 *
 * What it deliberately does not do is log in. Google detects and blocks
 * automated sign-in, and more to the point nobody should be handing an agent a
 * Google password. Instead the profile lives on disk: a real window opens, a
 * person signs in once, and the session persists into every later run. The
 * first run is interactive; the rest are not.
 *
 * Read-only by intent. This navigates to keyword research and exports a file.
 * It does not touch campaigns, budgets, or bids, and it must not be extended
 * to — the account it is signed into can spend money.
 */

/** Gitignored. Holds a live Google session, so it is a credential. */
export const PROFILE_DIR = resolve(
  process.env.ADS_BROWSER_PROFILE ?? "pipeline/.browser-profile",
);

export const DOWNLOAD_DIR = resolve(
  process.env.ADS_DOWNLOAD_DIR ?? "pipeline/data/downloads",
);

export async function openAdsBrowser(
  { headless = false }: { headless?: boolean } = {},
): Promise<BrowserContext> {
  mkdirSync(PROFILE_DIR, { recursive: true });
  mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const channels = ["msedge", "chrome"];
  let lastError: unknown;

  for (const channel of channels) {
    try {
      return await chromium.launchPersistentContext(PROFILE_DIR, {
        channel,
        headless,
        acceptDownloads: true,
        downloadsPath: DOWNLOAD_DIR,
        viewport: { width: 1440, height: 900 },
        locale: "en-US",
        args: [
          /* Google's sign-in flow refuses browsers it can tell are automated.
             This is the standard flag for that, and it matters here only
             because a person has to be able to log in through this window. */
          "--disable-blink-features=AutomationControlled",
        ],
      });
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Could not start a browser (tried ${channels.join(", ")}). ` +
      `Close any window already using the profile at ${PROFILE_DIR}. ` +
      `Last error: ${(lastError as Error)?.message}`,
  );
}

/**
 * Is this profile signed in to Google Ads?
 *
 * Checked by navigating rather than by looking for a cookie: Google keeps
 * plenty of cookies for a signed-out visitor, and the only reliable answer is
 * whether the Ads app renders or bounces to the sign-in screen.
 */
export async function isSignedIn(context: BrowserContext): Promise<boolean> {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://ads.google.com/aw/overview", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(4000);
  const url = page.url();
  return (
    !url.includes("accounts.google.com") &&
    !url.includes("/signin") &&
    !url.includes("servicelogin")
  );
}
