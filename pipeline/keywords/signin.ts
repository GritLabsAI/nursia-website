/**
 * One-time sign-in for the Ads browser profile.
 *
 *   npx tsx pipeline/keywords/signin.ts
 *
 * Opens a real window, waits for you to sign in to Google Ads, and stops as
 * soon as it sees the Ads app render. The session is written into the profile
 * directory, so every later run — including headless ones — reuses it and no
 * password is ever typed again, or seen by anything but your own browser.
 *
 * If it is already signed in this exits immediately.
 */

import { isSignedIn, openAdsBrowser, PROFILE_DIR } from "./browser";

const WAIT_MINUTES = Number(process.env.SIGNIN_WAIT_MINUTES ?? 6);

async function main() {
  console.log(`\nOpening a browser window with the profile at:\n  ${PROFILE_DIR}\n`);

  const context = await openAdsBrowser({ headless: false });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto("https://ads.google.com/aw/overview", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const deadline = Date.now() + WAIT_MINUTES * 60_000;
  let signedIn = false;

  console.log("Sign in to Google Ads in the window that just opened.");
  console.log(`Waiting up to ${WAIT_MINUTES} minutes…\n`);

  while (Date.now() < deadline) {
    const url = page.url();
    const onAds =
      url.startsWith("https://ads.google.com/") &&
      !url.includes("/signin") &&
      !url.includes("servicelogin");

    if (onAds) {
      /* The URL flips to the app before the app has finished deciding whether
         it actually has a session, so give it a moment and confirm rather than
         declaring success on a redirect. */
      await page.waitForTimeout(3000);
      if (await isSignedIn(context)) {
        signedIn = true;
        break;
      }
    }
    await page.waitForTimeout(2000);
  }

  if (!signedIn) {
    console.log(
      "\nStill not signed in. Re-run when you have a moment — the window has to " +
        "reach the Ads dashboard, not just the Google account page.\n",
    );
    await context.close();
    process.exit(1);
  }

  console.log("Signed in. The session is saved; later runs will not ask again.\n");
  await context.close();
}

main().catch((err) => {
  console.error(`\nSign-in failed: ${err.message}\n`);
  process.exit(1);
});
