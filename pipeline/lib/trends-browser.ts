import { chromium, type Browser, type Page } from "playwright-core";
import type { Candidate, KeywordObservation, Trajectory, TrendsSource } from "./trends";

/**
 * Google Trends, read through a real browser.
 *
 * Fetching the Trends endpoint from Node gets a 429 on the first request and
 * often on every request after it. Fetching the *same* endpoint from inside a
 * page on trends.google.com works, because by then the browser is holding the
 * consent and NID cookies Google set when the page loaded, and the request is
 * same-origin. So this adapter opens the site, waits for it to settle, and then
 * calls the API from within that origin.
 *
 * That is not a trick to get around a limit — it is doing what the product
 * itself does, at the pace a person would. Requests are throttled, 429s back
 * off and retry, and the whole run is a few dozen calls.
 *
 * ## The part that matters: Trends numbers are not comparable by default
 *
 * A single-keyword query is normalised to *its own* peak. Ask for "nclex" and
 * ask for "compact nursing license" separately and both come back with a
 * maximum of 100, which says nothing whatsoever about which is searched more.
 * Measured that way, "compact nursing license" averages 79 and "nclex"
 * averages 65 — and the real ratio is the other way round by a wide margin.
 * Every naive scrape of this endpoint gets that wrong.
 *
 * The fix is the one the Trends UI uses: compare terms *within a single
 * request*, where Google normalises them against each other on one scale.
 * There is a hard limit of five terms per comparison, so candidates are
 * batched in fours with an anchor term riding along in every batch. Each
 * candidate is then expressed as a ratio to the anchor, which is the same
 * quantity in every batch, and the ratios are finally rescaled to 0-100 across
 * the run.
 *
 * So `interest` here means: relative search interest against the other
 * candidates in this run, cross-calibrated through a shared anchor. It is a
 * ranking, honestly derived, not a search volume.
 */

/** Five per comparison is Google's limit; one slot goes to the anchor. */
const BATCH = 4;

/**
 * The anchor rides in every batch and ties the scales together.
 *
 * Choosing it badly silently destroys the run, and the failure looks exactly
 * like "this topic has no search interest". Trends returns integers on a 0-100
 * scale shared across the comparison, so a term far larger than the candidates
 * pins itself near 100 and rounds every candidate to zero. The first run here
 * used "nclex" and produced 22 zeros out of 26 — measured against "nclex", a
 * genuinely healthy term like "compact nursing license" is about 5% of it and
 * disappears into rounding.
 *
 * The anchor therefore has to be *mid-volume*: the same order of magnitude as
 * the things being measured. "nclex practice questions" sits about 2.6% of the
 * size of "nclex", which puts it right among the candidates, and it is stable
 * across the year.
 */
const ANCHOR = process.env.TRENDS_ANCHOR ?? "nclex practice questions";

/** Between requests. Slower than necessary is cheaper than getting blocked. */
const PAUSE_MS = Number(process.env.TRENDS_PAUSE ?? 6000);

/**
 * Set when Google redirects us to its abuse interstitial.
 *
 * The widget endpoint is protected more tightly than `explore` is, and when it
 * has had enough it answers with a 302 to google.com/sorry/index — a CAPTCHA
 * page. Because that is cross-origin, the in-page `fetch` cannot follow it and
 * the whole thing surfaces as a bare "TypeError: Failed to fetch", which looks
 * like a network fault and is really "you are asking too often".
 *
 * The response is to stop, not to work around it. Solving the interstitial,
 * rotating addresses, or dressing the browser up to look like someone else
 * would be circumventing an anti-abuse control, and this pipeline has a
 * perfectly good offline source for exactly this situation.
 */
let blocked = false;

export function browserTrendsSource(geo = "US"): TrendsSource {
  return {
    name: "google-trends-browser",
    async observe(candidates) {
      /* Measure the probe, report under the query. Several candidates can share
         a probe, and measuring it twice would waste a request and risk a 429,
         so the work is keyed by probe and fanned back out at the end. */
      const byProbe = new Map<string, Candidate[]>();
      for (const c of candidates) {
        const probe = (c.probe ?? c.query).trim();
        if (!probe) continue;
        byProbe.set(probe, [...(byProbe.get(probe) ?? []), c]);
      }
      const unique = [...byProbe.keys()];
      if (!unique.length) return [];

      const browser = await launch();
      try {
        const page = await warmUp(browser);
        const observedAt = new Date().toISOString().slice(0, 10);

        /* term -> its series on that batch's scale, plus the anchor's series
           from the same batch so the two can be divided. */
        const ratios = new Map<string, number>();
        const series = new Map<string, number[]>();

        for (let i = 0; i < unique.length; i += BATCH) {
          const batch = unique.slice(i, i + BATCH);
          const terms = [ANCHOR, ...batch];
          const n = Math.floor(i / BATCH) + 1;
          const total = Math.ceil(unique.length / BATCH);

          process.stdout.write(`    batch ${n}/${total}: ${batch.join(", ")}\n`);

          const rows = await comparison(page, terms, geo).catch(() => null);

          if (blocked) {
            throw new Error(
              "Google Trends served its abuse interstitial (google.com/sorry) " +
                "and is refusing further widget requests from this address.\n" +
                "  This is a rate limit, not a fault: the endpoint is " +
                "undocumented and unsupported, and sustained use trips it. The " +
                "in-page fetch cannot follow the cross-origin redirect, which " +
                "is why the underlying error reads 'Failed to fetch'.\n" +
                `  Wait — usually an hour or more — then re-run, or raise ` +
                `TRENDS_PAUSE (currently ${PAUSE_MS}ms), or use ` +
                "TRENDS_SOURCE=dataset or =csv, which is what the default is for.",
            );
          }

          if (!rows) {
            process.stdout.write(`      no data — skipped\n`);
            continue;
          }

          const anchorMean = mean(rows[0] ?? []);
          if (anchorMean <= 0) {
            /* Without the anchor the batch cannot be placed on the shared
               scale. Reporting it anyway would silently mix two scales, which
               is the exact error this whole design exists to avoid. */
            process.stdout.write(`      anchor flat — batch dropped\n`);
            continue;
          }

          batch.forEach((term, j) => {
            const points = rows[j + 1] ?? [];
            series.set(term, points);
            ratios.set(term, mean(points) / anchorMean);
          });

          await sleep(PAUSE_MS);
        }

        /* Rescale the anchor-relative ratios onto 0-100 across the run. */
        const top = Math.max(0, ...ratios.values());

        return unique
          .filter((probe) => ratios.has(probe))
          .flatMap((probe) => {
            const points = series.get(probe) ?? [];
            const interest =
              top > 0 ? Math.round((ratios.get(probe)! / top) * 100) : 0;
            const trajectory = classify(points);
            const share = (ratios.get(probe)! * 100).toFixed(1);

            return (byProbe.get(probe) ?? []).map(
              (c): KeywordObservation => ({
                query: c.query,
                interest,
                trajectory,
                source: "google-trends-browser",
                observedAt,
                geo,
                note:
                  `Measured via the probe "${probe}"` +
                  (c.probe && c.probe !== c.query ? " (proxy for this query)" : "") +
                  `, compared against "${ANCHOR}" in one 5-term request: ` +
                  `${share}% of the anchor's mean interest over 12 months.`,
              }),
            );
          });
      } finally {
        await browser.close();
      }
    },
  };
}

/* ------------------------------------------------------------------ browser */

/**
 * Uses an installed Edge or Chrome rather than downloading one.
 *
 * `playwright-core` ships no browsers, and asking a content pipeline to pull
 * 300MB of Chromium so it can read a chart is a poor trade on a machine that
 * already has two browsers on it.
 */
async function launch(): Promise<Browser> {
  /*
   * Headed, and that is not an oversight.
   *
   * Google blocks this endpoint for headless Chrome. The page itself loads
   * fine — right origin, right title, cookies set — and then every call to
   * /trends/api fails with a bare "TypeError: Failed to fetch", which looks
   * exactly like a network problem and is not one. The identical script with
   * `headless: false` returns 200 on the first try.
   *
   * So a run briefly opens a browser window. On a workstation that is a fair
   * price and it makes what the pipeline is doing visible, which is the honest
   * arrangement anyway. TRENDS_HEADLESS=1 forces headless for anyone who wants
   * to try it in CI — expect it to fail, and to fail confusingly.
   */
  const headless = process.env.TRENDS_HEADLESS === "1";
  const channels = ["msedge", "chrome"];
  let lastError: unknown;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless });
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Could not start a browser (tried ${channels.join(", ")}). ` +
      `Install Edge or Chrome, or run with TRENDS_SOURCE=dataset. ` +
      `Last error: ${(lastError as Error)?.message}`,
  );
}

/** Load the site once so the session holds the cookies the API expects. */
async function warmUp(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "UTC",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  /* Belt and braces against esbuild's helpers leaking into the page. The
     evaluate bodies are passed as source text so nothing should need this, but
     an identity `__name` costs nothing and turns a whole class of confusing
     failure into a no-op. Passed as raw content so esbuild cannot rewrite the
     shim itself. */
  await context.addInitScript({
    content: "globalThis.__name = globalThis.__name || ((fn) => fn);",
  });

  /* Watch for the abuse interstitial so the failure can be reported as what it
     actually is. Without this the run dies with "Failed to fetch" and the next
     hour goes on cookies, headless detection and CSP. */
  page.on("response", (res) => {
    if (res.url().includes("/sorry/index")) blocked = true;
  });
  page.on("requestfailed", (req) => {
    if (req.url().includes("/sorry/index")) blocked = true;
  });

  await page.goto("https://trends.google.com/trends/", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(2500);
  return page;
}

/**
 * One comparison request: up to five terms, one shared scale.
 *
 * Returns a row of weekly values per term, in the order the terms were given,
 * or null when Trends has nothing for this set.
 *
 * The body is a **string**, not a function, and that is load-bearing. tsx
 * compiles this file through esbuild to CommonJS, and esbuild rewrites
 * functions on the way — wrapping them in a `__name` helper for `keepNames`
 * and, for an async arrow in a CJS target, in an `__async` generator helper.
 * Playwright then serialises whatever it was handed and runs it in the page,
 * where neither helper exists. The failure is not a clear ReferenceError
 * either: it surfaces as a bare `TypeError: Failed to fetch` from inside the
 * mangled body, which reads exactly like a network problem and sends you
 * looking at cookies, headless detection and CSP for an hour.
 *
 * Passing source text means esbuild has nothing to rewrite. Arguments are
 * JSON-encoded into the text rather than passed separately, for the same
 * reason.
 */
async function comparison(
  page: Page,
  terms: string[],
  geo: string,
): Promise<number[][] | null> {
  const args = JSON.stringify({ terms, geo, pause: PAUSE_MS });

  return page.evaluate(`(async () => {
    const { terms, geo, pause } = ${args};

    async function getJson(url, tries) {
      for (let attempt = 1; attempt <= (tries || 3); attempt++) {
        const res = await fetch(url, { credentials: "include" });
        if (res.status === 429) {
          /* Trends throttles by burst far more than by volume, so waiting and
             retrying is usually enough. */
          await new Promise(function (r) { setTimeout(r, pause * attempt * 2); });
          continue;
        }
        if (!res.ok) return null;
        const text = await res.text();
        const start = text.indexOf("{");
        return start === -1 ? null : JSON.parse(text.slice(start));
      }
      return null;
    }

    const req = {
      comparisonItem: terms.map(function (keyword) {
        return { keyword: keyword, geo: geo, time: "today 12-m" };
      }),
      category: 0,
      property: ""
    };

    const explore = await getJson(
      "/trends/api/explore?hl=en-US&tz=0&req=" + encodeURIComponent(JSON.stringify(req))
    );
    const widgets = (explore && explore.widgets) || [];
    const widget = widgets.filter(function (w) { return w.id === "TIMESERIES"; })[0];
    if (!widget) return null;

    await new Promise(function (r) { setTimeout(r, pause); });

    const data = await getJson(
      "/trends/api/widgetdata/multiline?hl=en-US&tz=0" +
      "&req=" + encodeURIComponent(JSON.stringify(widget.request)) +
      "&token=" + encodeURIComponent(widget.token)
    );

    const timeline = (data && data.default && data.default.timelineData) || [];
    if (!timeline.length) return null;

    /* timelineData is one entry per week, each carrying one value per term.
       Transpose it into one row per term. */
    return terms.map(function (_, i) {
      return timeline.map(function (pt) {
        return (pt.value && pt.value[i]) || 0;
      });
    });
  })()`) as Promise<number[][] | null>;
}

/* -------------------------------------------------------------------- maths */

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Rising, steady, seasonal, or declining, from a year of weekly points.
 *
 * Seasonality is checked before direction because NCLEX demand genuinely is
 * seasonal — it spikes after each graduation wave — and mistaking a summer ramp
 * for a permanent rise is how a team publishes twelve pages about a topic that
 * quietly dies in October.
 */
function classify(points: number[]): Trajectory {
  const real = points.filter((n) => Number.isFinite(n));
  if (real.length < 12) return "steady";

  const q = Math.floor(real.length / 4);
  const recent = mean(real.slice(-q));
  const prior = mean(real.slice(-2 * q, -q));
  const peak = Math.max(...real);
  const trough = Math.min(...real);

  if (peak > 0 && trough / peak < 0.45) return "seasonal";
  if (prior > 0 && recent / prior > 1.2) return "rising";
  if (prior > 0 && recent / prior < 0.8) return "declining";
  return "steady";
}
