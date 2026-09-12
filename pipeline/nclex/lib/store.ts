import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * The local store for the review-page programme.
 *
 * A separate database file from `pipeline/data/content.db` on purpose. That one
 * holds the journey guides, whose rows are measured against Google Trends and
 * whose volume column means something Google said. This programme is fed by a
 * keyword export with a thousand rows in it, its pages are a different document
 * type on a different route, and mixing the two would mean every query about
 * either has to remember which is which. One file per programme, deletable
 * without consequence to the other.
 *
 * Four tables, because they fail and are re-run independently:
 *
 *   keyword  what the export says about the market — a thousand rows, untouched
 *   page     what we intend to publish — one row per planned page, deduped
 *   draft    the content itself, once it has passed the quality gates
 *   link     the internal links, both directions, with the rule that chose them
 *
 * `page` and `draft` are separate for the same reason the guide pipeline splits
 * topic from guide: re-scoring the plan when a fresher export arrives must not
 * touch prose that has already been written and reviewed, and rewriting a page
 * must not lose the research that justified it.
 *
 * SQLite via `node:sqlite`, which ships with Node. No native module to compile
 * and no service to run — one file that can be copied, diffed, queried with any
 * SQLite client, and thrown away.
 */

export type KeywordRow = {
  /** The query as the export spelled it. Primary key; never normalised here. */
  keyword: string;
  category: string;
  intent: string;
  difficulty: string;
  volume: number;
  /** 0-100 as the export reports it — not the same scale as competition. */
  keywordDifficulty: number;
  cpc: number;
  conversionPotential: string;
  contentType: string;
  source: string;
  observedAt: string;
};

export type PageStatus =
  | "planned"
  | "drafted"
  | "published"
  | "rejected"
  | "failed";

/** How the page argues. Decides the body shape, not the styling. */
export type PageKind = "practice" | "review" | "clinical" | "medication" | "strategy";

export type PageRow = {
  slug: string;
  title: string;
  h1: string;
  kind: PageKind;
  /** The NCLEX test-plan category, as the export labels it. */
  examCategory: string;
  primaryQuery: string;
  /** JSON array of the long-tail phrasings this page may legitimately answer. */
  secondary: string;
  volume: number;
  keywordDifficulty: number;
  cpc: number;
  intent: string;
  /** The question set in `src/lib/content.ts` this page must send readers to. */
  questionTopic: string;
  /** Where it sits in the journey, matching the guide schema's four clusters. */
  cluster: string;
  /** What makes this page not a generic essay. The anti-slop field. */
  angle: string;
  status: PageStatus;
  /** Set when the dedupe rejected it, naming what already covers the query. */
  dedupeOf: string | null;
  score: number;
  runId: string;
  createdAt: string;
};

export type DraftRow = {
  slug: string;
  shortAnswer: string;
  /** JSON array of strings — the scannable claims above the fold. */
  keyPoints: string;
  /** JSON: [{h2, body: string[]}] */
  sections: string;
  /** JSON: [{q, a}] */
  faqs: string;
  /** Where the exam's phrasing and the ward's practice come apart. Optional. */
  examTip: string | null;
  words: number;
  minutes: number;
  /** Who wrote it: "editorial" here, since every page in run 1 is hand-written. */
  author: string;
  status: "drafted" | "published" | "failed";
  error: string | null;
  sanityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinkRow = {
  /** Slug of the page the link lives on. Editing this document adds the link. */
  fromSlug: string;
  /** "seoPage" | "guide" — which document type `fromSlug` is. */
  fromType: string;
  toSlug: string;
  toType: string;
  /** Which rule chose it, so a bad automatic link is visible rather than magic. */
  rule: string;
  createdAt: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keyword (
  keyword               TEXT PRIMARY KEY,
  category              TEXT,
  intent                TEXT,
  difficulty            TEXT,
  volume                INTEGER NOT NULL DEFAULT 0,
  keyword_difficulty    INTEGER,
  cpc                   REAL,
  conversion_potential  TEXT,
  content_type          TEXT,
  source                TEXT NOT NULL,
  observed_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page (
  slug                TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  h1                  TEXT NOT NULL,
  kind                TEXT NOT NULL,
  exam_category       TEXT NOT NULL,
  primary_query       TEXT NOT NULL,
  secondary           TEXT NOT NULL DEFAULT '[]',
  volume              INTEGER NOT NULL DEFAULT 0,
  keyword_difficulty  INTEGER,
  cpc                 REAL,
  intent              TEXT,
  question_topic      TEXT NOT NULL,
  cluster             TEXT NOT NULL,
  angle               TEXT,
  status              TEXT NOT NULL DEFAULT 'planned',
  dedupe_of           TEXT,
  score               REAL NOT NULL DEFAULT 0,
  run_id              TEXT NOT NULL,
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft (
  slug         TEXT PRIMARY KEY,
  short_answer TEXT NOT NULL,
  key_points   TEXT NOT NULL DEFAULT '[]',
  sections     TEXT NOT NULL,
  faqs         TEXT NOT NULL DEFAULT '[]',
  exam_tip     TEXT,
  words        INTEGER NOT NULL DEFAULT 0,
  minutes      INTEGER NOT NULL DEFAULT 1,
  author       TEXT,
  status       TEXT NOT NULL DEFAULT 'drafted',
  error        TEXT,
  sanity_id    TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS link (
  from_slug   TEXT NOT NULL,
  from_type   TEXT NOT NULL,
  to_slug     TEXT NOT NULL,
  to_type     TEXT NOT NULL,
  rule        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (from_slug, to_slug)
);

CREATE TABLE IF NOT EXISTS run (
  id          TEXT NOT NULL,
  stage       TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  note        TEXT,
  PRIMARY KEY (id, stage)
);

CREATE INDEX IF NOT EXISTS page_status ON page (status);
CREATE INDEX IF NOT EXISTS page_score  ON page (score DESC);
CREATE INDEX IF NOT EXISTS link_to     ON link (to_slug);
CREATE INDEX IF NOT EXISTS keyword_vol ON keyword (volume DESC);
`;

export const DB_PATH = resolve(
  process.env.NCLEX_DB ?? "pipeline/nclex/data/nclex.db",
);

export function openStore(path: string = DB_PATH): Store {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  /* WAL so a second connection — a query, a dashboard, another stage — can
     read while a stage is still writing. */
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return new Store(db);
}

export class Store {
  constructor(private db: DatabaseSync) {}

  close() {
    this.db.close();
  }

  /* ------------------------------------------------------------- keywords */

  putKeywords(rows: KeywordRow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO keyword (keyword, category, intent, difficulty, volume,
                           keyword_difficulty, cpc, conversion_potential,
                           content_type, source, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(keyword) DO UPDATE SET
        category = excluded.category,
        intent = excluded.intent,
        difficulty = excluded.difficulty,
        volume = excluded.volume,
        keyword_difficulty = excluded.keyword_difficulty,
        cpc = excluded.cpc,
        conversion_potential = excluded.conversion_potential,
        content_type = excluded.content_type,
        source = excluded.source,
        observed_at = excluded.observed_at
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(
          r.keyword, r.category, r.intent, r.difficulty, r.volume,
          r.keywordDifficulty, r.cpc, r.conversionPotential, r.contentType,
          r.source, r.observedAt,
        );
      }
    });
  }

  keywords(): KeywordRow[] {
    return this.db
      .prepare(
        `SELECT keyword, category, intent, difficulty, volume,
                keyword_difficulty AS keywordDifficulty, cpc,
                conversion_potential AS conversionPotential,
                content_type AS contentType, source, observed_at AS observedAt
         FROM keyword ORDER BY volume DESC`,
      )
      .all() as unknown as KeywordRow[];
  }

  /* ---------------------------------------------------------------- pages */

  putPages(rows: PageRow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO page (slug, title, h1, kind, exam_category, primary_query,
                        secondary, volume, keyword_difficulty, cpc, intent,
                        question_topic, cluster, angle, status, dedupe_of,
                        score, run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        h1 = excluded.h1,
        secondary = excluded.secondary,
        volume = excluded.volume,
        keyword_difficulty = excluded.keyword_difficulty,
        cpc = excluded.cpc,
        score = excluded.score,
        angle = excluded.angle
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(
          r.slug, r.title, r.h1, r.kind, r.examCategory, r.primaryQuery,
          r.secondary, r.volume, r.keywordDifficulty, r.cpc, r.intent,
          r.questionTopic, r.cluster, r.angle, r.status, r.dedupeOf,
          r.score, r.runId, r.createdAt,
        );
      }
    });
  }

  pages(status?: PageStatus): PageRow[] {
    const where = status ? `WHERE status = ?` : ``;
    const args = status ? [status] : [];
    return this.db
      .prepare(
        `SELECT slug, title, h1, kind, exam_category AS examCategory,
                primary_query AS primaryQuery, secondary, volume,
                keyword_difficulty AS keywordDifficulty, cpc, intent,
                question_topic AS questionTopic, cluster, angle, status,
                dedupe_of AS dedupeOf, score, run_id AS runId,
                created_at AS createdAt
         FROM page ${where} ORDER BY score DESC`,
      )
      .all(...args) as unknown as PageRow[];
  }

  page(slug: string): PageRow | undefined {
    return this.pages().find((p) => p.slug === slug);
  }

  setPageStatus(slug: string, status: PageStatus) {
    this.db.prepare(`UPDATE page SET status = ? WHERE slug = ?`).run(status, slug);
  }

  /* --------------------------------------------------------------- drafts */

  putDraft(d: DraftRow) {
    this.db
      .prepare(
        `INSERT INTO draft (slug, short_answer, key_points, sections, faqs,
                            exam_tip, words, minutes, author, status, error,
                            sanity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           short_answer = excluded.short_answer,
           key_points = excluded.key_points,
           sections = excluded.sections,
           faqs = excluded.faqs,
           exam_tip = excluded.exam_tip,
           words = excluded.words,
           minutes = excluded.minutes,
           author = excluded.author,
           status = excluded.status,
           error = excluded.error,
           updated_at = excluded.updated_at`,
      )
      .run(
        d.slug, d.shortAnswer, d.keyPoints, d.sections, d.faqs, d.examTip,
        d.words, d.minutes, d.author, d.status, d.error, d.sanityId,
        d.createdAt, d.updatedAt,
      );
  }

  drafts(status?: string): DraftRow[] {
    const where = status ? `WHERE status = ?` : ``;
    const args = status ? [status] : [];
    return this.db
      .prepare(
        `SELECT slug, short_answer AS shortAnswer, key_points AS keyPoints,
                sections, faqs, exam_tip AS examTip, words, minutes, author,
                status, error,
                sanity_id AS sanityId, created_at AS createdAt,
                updated_at AS updatedAt
         FROM draft ${where} ORDER BY slug`,
      )
      .all(...args) as unknown as DraftRow[];
  }

  markPublished(slug: string, sanityId: string) {
    this.db
      .prepare(
        `UPDATE draft SET status = 'published', sanity_id = ?, updated_at = ?
         WHERE slug = ?`,
      )
      .run(sanityId, new Date().toISOString(), slug);
    this.setPageStatus(slug, "published");
  }

  /* ---------------------------------------------------------------- links */

  putLinks(rows: LinkRow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO link (from_slug, from_type, to_slug, to_type, rule, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(from_slug, to_slug) DO UPDATE SET rule = excluded.rule
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(r.fromSlug, r.fromType, r.toSlug, r.toType, r.rule, r.createdAt);
      }
    });
  }

  links(): LinkRow[] {
    return this.db
      .prepare(
        `SELECT from_slug AS fromSlug, from_type AS fromType,
                to_slug AS toSlug, to_type AS toType, rule,
                created_at AS createdAt
         FROM link ORDER BY from_slug`,
      )
      .all() as unknown as LinkRow[];
  }

  /** How many recorded links point at each page. The orphan check reads this. */
  inboundCounts(): Map<string, number> {
    const rows = this.db
      .prepare(`SELECT to_slug AS slug, COUNT(*) AS n FROM link GROUP BY to_slug`)
      .all() as unknown as { slug: string; n: number }[];
    return new Map(rows.map((r) => [r.slug, Number(r.n)]));
  }

  /* ------------------------------------------------------------ reporting */

  counts(): Record<string, number> {
    const rows = this.db
      .prepare(
        `SELECT 'page:' || status AS k, COUNT(*) AS n FROM page GROUP BY status
         UNION ALL
         SELECT 'draft:' || status, COUNT(*) FROM draft GROUP BY status
         UNION ALL
         SELECT 'keyword', COUNT(*) FROM keyword
         UNION ALL
         SELECT 'link', COUNT(*) FROM link`,
      )
      .all() as unknown as { k: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
  }

  startRun(id: string, stage: string, note = "") {
    this.db
      .prepare(
        `INSERT INTO run (id, stage, started_at, note) VALUES (?, ?, ?, ?)
         ON CONFLICT(id, stage) DO UPDATE SET started_at = excluded.started_at`,
      )
      .run(id, stage, new Date().toISOString(), note);
  }

  finishRun(id: string, stage: string, note = "") {
    this.db
      .prepare(`UPDATE run SET finished_at = ?, note = ? WHERE id = ? AND stage = ?`)
      .run(new Date().toISOString(), note, id, stage);
  }

  private tx(fn: () => void) {
    this.db.exec("BEGIN");
    try {
      fn();
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}
