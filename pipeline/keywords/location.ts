import type { Page } from "playwright-core";

/**
 * Force Keyword Planner's target market.
 *
 * This account defaults to India, and for an NCLEX site that is not a small
 * inaccuracy — it is the wrong market entirely. The failure is silent and
 * convincing: the run completes, the table fills with sensible-looking
 * keywords and volumes, the bids are quoted in rupees, and nothing downstream
 * has any way to notice that the demand it is planning a thousand pages around
 * belongs to a different country.
 *
 * So this throws rather than warns, and the caller is expected to let it.
 *
 * The interaction is fiddly because the picker is three separate surfaces: a
 * chip on the form, a `material-dialog` holding the currently selected
 * locations as removable chips, and a *separate* overlay of search matches,
 * each with its own "Include" action. Typing into the dialog does not select
 * anything; only the Include action in the matches overlay does.
 */
export async function setLocation(page: Page, name = "United States"): Promise<string> {
  await page
    .locator("button, [role=button]")
    .filter({ hasText: /location_on/i })
    .first()
    .click();
  await page.waitForTimeout(3000);

  const dialog = page.locator("material-dialog").filter({ hasText: "Location" }).first();
  await dialog.waitFor({ state: "visible", timeout: 30_000 });

  const input = dialog.locator("input").first();
  await input.click();
  /* `fill` rather than `type`: the field is an Angular auto-suggest that
     debounces, and a per-character type fires a query per keystroke. */
  await input.fill(name);
  await page.waitForTimeout(4500);

  /* The matches list is its own overlay, a sibling of the dialog rather than
     a child of it, so it has to be found from the overlay container. */
  const matches = page
    .locator(".acx-overlay-container > *")
    .filter({ hasText: "Matches" })
    .last();
  await matches.waitFor({ state: "visible", timeout: 30_000 });

  /* The row whose name is exactly what was asked for — "United States" also
     prefixes "United States Minor Outlying Islands", and including that
     instead would be the same class of silent wrongness. */
  const row = matches
    .locator("tr, [role=row]")
    .filter({ hasText: new RegExp(`^\\s*${escapeRe(name)}\\b`) })
    .first();

  const include = row.getByText("Include", { exact: true }).first();
  await include.click({ timeout: 20_000 });
  await page.waitForTimeout(2500);

  /* Drop every location that is not the one we asked for. Adding United States
     while leaving India selected gives a blended two-country figure, which is
     worse than either country alone because it looks like neither. */
  await removeOtherLocations(page, dialog, name);

  const saveButton = dialog
    .locator("button, [role=button]")
    .filter({ hasText: /^(Save|Done|Apply)$/i })
    .first();
  if (await saveButton.isVisible().catch(() => false)) {
    await saveButton.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(2500);

  const shown = await currentLocation(page);
  if (!new RegExp(escapeRe(name), "i").test(shown)) {
    throw new Error(
      `Could not set the location to ${name} — it still reads "${shown}". ` +
        `Refusing to harvest: the volumes would describe the wrong market.`,
    );
  }
  return shown;
}

async function removeOtherLocations(
  page: Page,
  dialog: ReturnType<Page["locator"]>,
  keep: string,
) {
  for (let pass = 0; pass < 6; pass++) {
    const chips = dialog.locator("tr, [role=row]").filter({ hasText: /country|region|city/i });
    const n = await chips.count();
    let removed = false;

    for (let i = 0; i < n; i++) {
      const chip = chips.nth(i);
      const text = (await chip.innerText().catch(() => "")) ?? "";
      if (!text.trim() || new RegExp(escapeRe(keep), "i").test(text)) continue;

      const cancel = chip.getByText("cancel", { exact: true }).first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await page.waitForTimeout(1200);
        removed = true;
        break;
      }
    }
    if (!removed) return;
  }
}

/** What the form currently says the market is. */
export async function currentLocation(page: Page): Promise<string> {
  return (await page.evaluate(`(() => {
    var t = document.body.innerText;
    var i = t.indexOf("location_on");
    if (i === -1) return "?";
    return t.slice(i + 11, i + 70).split(String.fromCharCode(10))
      .filter(function (s) { return s.trim(); })[0] || "?";
  })()`)) as string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
