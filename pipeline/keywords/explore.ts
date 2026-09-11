import { readFileSync } from "node:fs";
import { openAdsBrowser, selectAccount } from "./browser";
import { setLocation } from "./location";
import { downloadIdeasCsv } from "./download";

async function main() {
  const ctx = await openAdsBrowser({ headless: false });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  await page.goto("https://ads.google.com/aw/keywordplanner/home", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(7000);
  await selectAccount(ctx, "6331825613");
  await page.waitForTimeout(5000);

  await page.getByText("Discover new keywords", { exact: false }).first().click();
  await page.waitForTimeout(4000);
  await setLocation(page, "United States");

  const input = page.locator('input[aria-label="Search input"]').first();
  await input.click();
  for (const s of ["nclex practice questions", "nursing pharmacology"]) {
    await input.type(s, { delay: 25 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  }
  await page.getByRole("button", { name: /get results/i }).first().click();
  await page.waitForTimeout(12_000);

  const file = await downloadIdeasCsv(page, "smoke");
  console.log("downloaded:", file);

  for (const enc of ["utf16le", "utf8"] as const) {
    const text = readFileSync(file, enc);
    const lines = text.split(/\r?\n/).filter(Boolean);
    const looksRight = lines.some((l) => /keyword/i.test(l));
    console.log(`\n[${enc}] lines=${lines.length} plausible=${looksRight}`);
    if (looksRight) {
      console.log(lines.slice(0, 4).map((l) => "  " + l.slice(0, 150)).join("\n"));
      break;
    }
  }

  await ctx.close();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
