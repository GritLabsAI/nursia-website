/**
 * Where the research step gets its numbers.
 *
 * The honest situation, stated once so nobody rediscovers it at 2am: Google
 * Trends has no free, official, general-access API. There is an official API
 * in limited alpha behind an allowlist, and there is the endpoint the public
 * site calls, which works, is undocumented, rate-limits aggressively, and can
 * change shape without warning. Every "Google Trends API" package on npm is a
 * wrapper around the second one.
 *
 * Building the pipeline directly on that endpoint would make content
 * publishing depend on an unversioned endpoint staying the same — the kind of
 * dependency that works for a month and then fails on the morning somebody
 * needs it. So the pipeline depends on this interface instead, and the
 * endpoint is one implementation of it:
 *
 *   google   — the live endpoint. Best data, least reliable.
 *   csv      — an export from Trends, Google Ads Keyword Planner, Ahrefs,
 *              anything. Best data when somebody has done the work.
 *   dataset  — a committed, reviewed JSON file. Always works, never lies
 *              about where it came from, and is what run 1 uses.
 *
 * They return the same shape, so the stages downstream neither know nor care
 * which one ran. Set TRENDS_SOURCE to choose; the default is `dataset`,
 * because a content pipeline that cannot run offline is a content pipeline
 * that stops the week Google changes a query parameter.
 */

import { readFile } from "node:fs/promises";

export type Trajectory = "rising" | "steady" | "seasonal" | "declining";

export type KeywordObservation = {
  /** The search, as somebody would type it. */
  query: string;
  /** 0-100 relative interest, in the Google Trends sense. */
  interest: number;
  trajectory: Trajectory;
  /** Long-tail phrasings of the same need — usually the FAQ list. */
  related?: string[];
  /** Which adapter produced this, so a reader can weigh it. */
  source: string;
  /** ISO date. A trend score with no date on it is a rumour. */
  observedAt: string;
  geo?: string;
  /** Why it is interesting, when a number alone does not say. */
  note?: string;
};

/** See `Candidate` below — the query to aim at, and the term to measure with. */
export interface TrendsSource {
  readonly name: string;
  observe(candidates: Candidate[]): Promise<KeywordObservation[]>;
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ google */

/**
 * The endpoint the trends.google.com front-end calls.
 *
 * Two requests per keyword: `explore` hands back widget tokens, and each
 * widget is then fetched by token. Responses are prefixed with `)]}'` to break
 * naive JSON parsing by a cross-origin script, so that gets stripped.
 *
 * It will rate-limit. That is not a bug to fix here — it is the reason this
 * adapter is not the default.
 */
export function googleTrendsSource(geo = "US"): TrendsSource {
  const BASE = "https://trends.google.com/trends/api";

  async function getJson(url: string): Promise<unknown> {
    const res = await fetch(url, {
      headers: {
        /* Without a browser-shaped UA the endpoint returns 403 more often. */
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (res.status === 429) {
      throw new Error(
        "Google Trends rate-limited the request (429). This is routine for " +
          "the unofficial endpoint — wait, or run with TRENDS_SOURCE=dataset.",
      );
    }
    if (!res.ok) {
      throw new Error(`Google Trends returned ${res.status} for ${url}`);
    }
    const text = await res.text();
    /* Strip the anti-hijacking prefix: )]}'\n or )]}, */
    const start = text.indexOf("{");
    if (start === -1) throw new Error("Google Trends returned no JSON object");
    return JSON.parse(text.slice(start));
  }

  type Widget = { id: string; token: string; request: unknown };

  async function widgetsFor(query: string): Promise<Widget[]> {
    const req = {
      comparisonItem: [{ keyword: query, geo, time: "today 12-m" }],
      category: 0,
      property: "",
    };
    const url =
      `${BASE}/explore?hl=en-US&tz=0` +
      `&req=${encodeURIComponent(JSON.stringify(req))}`;
    const body = (await getJson(url)) as { widgets?: Widget[] };
    return body.widgets ?? [];
  }

  async function widgetData(widget: Widget, path: string): Promise<unknown> {
    const url =
      `${BASE}/widgetdata/${path}?hl=en-US&tz=0` +
      `&req=${encodeURIComponent(JSON.stringify(widget.request))}` +
      `&token=${encodeURIComponent(widget.token)}`;
    return getJson(url);
  }

  return {
    name: "google-trends",
    async observe(candidates) {
      const out: KeywordObservation[] = [];

      for (const candidate of candidates) {
        const query = candidate.query;
        const widgets = await widgetsFor(candidate.probe ?? query);

        const timeseries = widgets.find((w) => w.id === "TIMESERIES");
        const related = widgets.find((w) => w.id.startsWith("RELATED_QUERIES"));

        let interest = 0;
        let trajectory: Trajectory = "steady";

        if (timeseries) {
          const data = (await widgetData(timeseries, "multiline")) as {
            default?: { timelineData?: { value?: number[] }[] };
          };
          const points = (data.default?.timelineData ?? [])
            .map((p) => p.value?.[0] ?? 0)
            .filter((n) => Number.isFinite(n));

          if (points.length) {
            interest = Math.round(
              points.slice(-8).reduce((a, b) => a + b, 0) /
                Math.min(8, points.length),
            );
            trajectory = classify(points);
          }
        }

        let relatedQueries: string[] | undefined;
        if (related) {
          const data = (await widgetData(related, "relatedsearches")) as {
            default?: {
              rankedList?: { rankedKeyword?: { query?: string }[] }[];
            };
          };
          relatedQueries = (data.default?.rankedList ?? [])
            .flatMap((list) => list.rankedKeyword ?? [])
            .map((k) => k.query)
            .filter((q): q is string => Boolean(q))
            .slice(0, 8);
        }

        out.push({
          query,
          interest,
          trajectory,
          related: relatedQueries,
          source: "google-trends",
          observedAt: today(),
          geo,
        });
      }

      return out;
    },
  };
}

/**
 * Rising, steady, seasonal, or declining, from a year of weekly points.
 *
 * Compares the last quarter against the one before it, then checks whether the
 * series swings hard enough across the year to be seasonal rather than
 * directional. NCLEX search demand genuinely is seasonal — it spikes after
 * each graduation wave — and mistaking the summer ramp for a permanent rise is
 * the classic way to publish twelve pages about a topic that quietly dies in
 * October.
 */
function classify(points: number[]): Trajectory {
  if (points.length < 12) return "steady";
  const q = Math.floor(points.length / 4);
  const recent = mean(points.slice(-q));
  const prior = mean(points.slice(-2 * q, -q));
  const peak = Math.max(...points);
  const trough = Math.min(...points);

  /* A series that more than doubles between trough and peak within one year is
     a season, whichever way the last quarter happens to be pointing. */
  if (peak > 0 && trough / peak < 0.45) return "seasonal";
  if (prior > 0 && recent / prior > 1.2) return "rising";
  if (prior > 0 && recent / prior < 0.8) return "declining";
  return "steady";
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/* --------------------------------------------------------------------- csv */

/**
 * A keyword export, from whichever tool somebody has a seat for.
 *
 * Expects a header row and, at minimum, columns for the query and a volume or
 * interest number. Column names differ per tool, so they are matched loosely
 * rather than demanding one exact spelling that only Ahrefs uses.
 */
export function csvSource(path: string): TrendsSource {
  return {
    name: "keyword-csv",
    async observe() {
      const text = await readFile(path, "utf8");
      const rows = parseCsv(text);
      if (!rows.length) return [];

      const header = rows[0].map((h) => h.trim().toLowerCase());
      const queryCol = header.findIndex((h) =>
        ["keyword", "query", "search term", "term"].includes(h),
      );
      const volumeCol = header.findIndex((h) =>
        ["volume", "search volume", "interest", "avg. monthly searches"].includes(
          h,
        ),
      );

      if (queryCol === -1) {
        throw new Error(
          `${path} has no keyword column. Expected one of: keyword, query, ` +
            `search term, term. Found: ${header.join(", ")}`,
        );
      }

      const raw = rows.slice(1).map((row) => ({
        query: row[queryCol]?.trim() ?? "",
        volume: volumeCol === -1 ? 0 : Number(row[volumeCol]?.replace(/[,\s]/g, "") ?? 0),
      }));

      /* Volumes are absolute; the rest of the pipeline speaks in 0-100
         relative interest. Normalise against the biggest in the file so the
         two adapters produce comparable numbers. */
      const top = Math.max(1, ...raw.map((r) => r.volume));

      return raw
        .filter((r) => r.query)
        .map(
          (r): KeywordObservation => ({
            query: r.query,
            interest: Math.round((r.volume / top) * 100),
            trajectory: "steady",
            source: "keyword-csv",
            observedAt: today(),
            note: `Volume ${r.volume || "unknown"} from ${path}`,
          }),
        );
    },
  };
}

/** Enough CSV for an export: quoted fields, embedded commas, doubled quotes. */
function parseCsv(text: string): string[][] {
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
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/* ----------------------------------------------------------------- dataset */

/**
 * A committed, reviewed observation set.
 *
 * This is the adapter run 1 uses, and it is not a stub. The file it reads is
 * the output of a real research pass, it is in git, and it carries the date it
 * was taken and the reasoning for each entry. That makes it auditable in a way
 * a live scrape is not: six months from now you can see exactly what the topic
 * list was chosen on, which you cannot do with a number that was fetched once
 * and never written down.
 */
export function datasetSource(path: string): TrendsSource {
  return {
    name: "dataset",
    async observe() {
      const raw = JSON.parse(await readFile(path, "utf8")) as {
        observedAt?: string;
        geo?: string;
        keywords: KeywordObservation[];
      };
      return raw.keywords.map((k) => ({
        ...k,
        source: k.source ?? "dataset",
        observedAt: k.observedAt ?? raw.observedAt ?? today(),
        geo: k.geo ?? raw.geo,
      }));
    },
  };
}

/* ---------------------------------------------------------------- resolver */

export type Candidate = {
  /** The query the page is actually aiming at. */
  query: string;
  /**
   * The short head term measured in its place.
   *
   * Google Trends will not report on a multi-word long-tail phrase. It returns
   * a flat zero regardless of what it is compared against, and that zero means
   * "below the reporting threshold", not "nobody searches this" — measured
   * directly, 22 of these 26 candidates came back as zero while the same
   * topics registered clearly as head terms. So each candidate names the
   * shortest term that honestly stands in for it and is large enough for
   * Trends to answer about.
   */
  probe?: string;
  /** Why the query matters. Editorial; no trend number can supply it. */
  note?: string;
};

/** The queries a source should measure, read from the committed candidate file. */
export async function candidateQueries(path: string): Promise<Candidate[]> {
  const raw = JSON.parse(await readFile(path, "utf8")) as {
    keywords: Candidate[];
  };
  return raw.keywords.map((k) => ({
    query: k.query,
    probe: k.probe,
    note: k.note,
  }));
}

export async function resolveSource(datasetPath: string): Promise<TrendsSource> {
  const choice = process.env.TRENDS_SOURCE ?? "dataset";
  switch (choice) {
    case "browser": {
      /* Imported on demand so a dataset run never loads playwright. */
      const { browserTrendsSource } = await import("./trends-browser");
      return browserTrendsSource(process.env.TRENDS_GEO ?? "US");
    }
    case "google":
      return googleTrendsSource(process.env.TRENDS_GEO ?? "US");
    case "csv": {
      const path = process.env.TRENDS_CSV;
      if (!path) {
        throw new Error("TRENDS_SOURCE=csv needs TRENDS_CSV to point at a file.");
      }
      return csvSource(path);
    }
    case "dataset":
      return datasetSource(datasetPath);
    default:
      throw new Error(
        `Unknown TRENDS_SOURCE "${choice}". Use browser, google, csv, or dataset.`,
      );
  }
}
