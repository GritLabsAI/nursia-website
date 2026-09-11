import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * The local content store.
 *
 * A thousand-page batch is a long-running job made of a thousand independent
 * failures waiting to happen — a rate limit, a malformed response, a laptop
 * lid. Holding the output in memory and writing at the end means one of those
 * costs the entire run. So every row is committed the moment it exists, and
 * every row carries a status, which makes the batch resumable: re-running skips
 * what is already `drafted` and picks up what is `planned` or `failed`.
 *
 * SQLite via `node:sqlite`, which ships with Node 24. No native module to
 * compile, no service to run, one file on disk that can be copied, diffed,
 * queried with any SQLite client, and deleted without consequence. It is
 * deliberately *not* Sanity: the content lake is where finished work is
 * published, and using it as scratch space for a batch that is 40% failures
 * means a thousand half-written documents an editor has to wade through.
 *
 * Three layers, because they fail and are re-run independently:
 *
 *   keyword  what the market says — volumes from Keyword Planner or elsewhere
 *   topic    what we intend to write — one row per planned page, deduped
 *   guide    what was actually written — the content itself
 *
 * A topic can be re-scored when better keyword data arrives without touching
 * the guide that was written from it, and a guide can be regenerated without
 * losing the research that justified it.
 */

export type KeywordRow = {
  keyword: string;
  volume: number;
  competition: string;
  competitionIndex: number;
  lowBid: number;
  highBid: number;
  source: string;
  observedAt: string;
  /** JSON: 12 months of {year, month, searches}. */
  monthly: string | null;
};

export type TopicStatus =
  | "planned"
  | "drafting"
  | "drafted"
  | "failed"
  | "published"
  | "rejected";

export type TopicRow = {
  slug: string;
  title: string;
  h1: string;
  cluster: string;
  primaryQuery: string;
  /** JSON array of long-tail phrasings. */
  secondary: string;
  volume: number;
  competition: string;
  intent: string;
  /** Which question set in Sanity this page must link to. */
  nursingTopic: string;
  /** What makes this page not a generic essay. The anti-slop field. */
  angle: string;
  status: TopicStatus;
  /** Set when the dedupe rejected it, naming what covers it. */
  dedupeOf: string | null;
  runId: string;
  createdAt: string;
};

export type GuideRow = {
  slug: string;
  title: string;
  h1: string;
  cluster: string;
  shortAnswer: string;
  /** JSON: [{h2, body: string[]}] */
  sections: string;
  /** JSON: [{q, a}] */
  faqs: string;
  minutes: number;
  words: number;
  nursingTopic: string;
  /** JSON array of slugs. */
  readNext: string;
  model: string;
  status: "drafted" | "published" | "failed";
  error: string | null;
  sanityId: string | null;
  createdAt: string;
  updatedAt: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keyword (
  keyword            TEXT PRIMARY KEY,
  volume             INTEGER NOT NULL DEFAULT 0,
  competition        TEXT,
  competition_index  INTEGER,
  low_bid            REAL,
  high_bid           REAL,
  source             TEXT NOT NULL,
  observed_at        TEXT NOT NULL,
  monthly            TEXT
);

CREATE TABLE IF NOT EXISTS topic (
  slug           TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  h1             TEXT NOT NULL,
  cluster        TEXT NOT NULL,
  primary_query  TEXT NOT NULL,
  secondary      TEXT NOT NULL DEFAULT '[]',
  volume         INTEGER NOT NULL DEFAULT 0,
  competition    TEXT,
  intent         TEXT,
  nursing_topic  TEXT NOT NULL,
  angle          TEXT,
  status         TEXT NOT NULL DEFAULT 'planned',
  dedupe_of      TEXT,
  run_id         TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guide (
  slug           TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  h1             TEXT NOT NULL,
  cluster        TEXT NOT NULL,
  short_answer   TEXT NOT NULL,
  sections       TEXT NOT NULL,
  faqs           TEXT NOT NULL DEFAULT '[]',
  minutes        INTEGER NOT NULL DEFAULT 1,
  words          INTEGER NOT NULL DEFAULT 0,
  nursing_topic  TEXT NOT NULL,
  read_next      TEXT NOT NULL DEFAULT '[]',
  model          TEXT,
  status         TEXT NOT NULL DEFAULT 'drafted',
  error          TEXT,
  sanity_id      TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run (
  id          TEXT NOT NULL,
  stage       TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  note        TEXT,
  PRIMARY KEY (id, stage)
);

CREATE INDEX IF NOT EXISTS topic_status  ON topic (status);
CREATE INDEX IF NOT EXISTS topic_volume  ON topic (volume DESC);
CREATE INDEX IF NOT EXISTS guide_status  ON guide (status);
CREATE INDEX IF NOT EXISTS keyword_vol   ON keyword (volume DESC);
`;

export const DB_PATH = resolve(
  process.env.CONTENT_DB ?? "pipeline/data/content.db",
);

export function openStore(path: string = DB_PATH): Store {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  /* WAL lets a reader (a query, a dashboard) look at the database while the
     batch is still writing, which over a run of this length is the difference
     between being able to watch progress and having to wait for it. */
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
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
      INSERT INTO keyword (keyword, volume, competition, competition_index,
                           low_bid, high_bid, source, observed_at, monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(keyword) DO UPDATE SET
        volume = excluded.volume,
        competition = excluded.competition,
        competition_index = excluded.competition_index,
        low_bid = excluded.low_bid,
        high_bid = excluded.high_bid,
        source = excluded.source,
        observed_at = excluded.observed_at,
        monthly = excluded.monthly
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(
          r.keyword,
          r.volume,
          r.competition,
          r.competitionIndex,
          r.lowBid,
          r.highBid,
          r.source,
          r.observedAt,
          r.monthly,
        );
      }
    });
  }

  keywords(minVolume = 0, limit = 100_000): KeywordRow[] {
    return this.db
      .prepare(
        `SELECT keyword, volume, competition,
                competition_index AS competitionIndex,
                low_bid AS lowBid, high_bid AS highBid,
                source, observed_at AS observedAt, monthly
         FROM keyword WHERE volume >= ? ORDER BY volume DESC LIMIT ?`,
      )
      .all(minVolume, limit) as unknown as KeywordRow[];
  }

  /* --------------------------------------------------------------- topics */

  putTopics(rows: TopicRow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO topic (slug, title, h1, cluster, primary_query, secondary,
                         volume, competition, intent, nursing_topic, angle,
                         status, dedupe_of, run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        volume = excluded.volume,
        competition = excluded.competition,
        secondary = excluded.secondary
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(
          r.slug, r.title, r.h1, r.cluster, r.primaryQuery, r.secondary,
          r.volume, r.competition, r.intent, r.nursingTopic, r.angle,
          r.status, r.dedupeOf, r.runId, r.createdAt,
        );
      }
    });
  }

  /**
   * The work queue.
   *
   * `planned` and `failed` both come back, which is what makes a re-run pick up
   * after a crash instead of starting over. `drafting` deliberately does not:
   * a row left in that state is one a previous run was mid-way through, and
   * quietly redoing it is how the same page gets written twice.
   */
  pending(limit: number): TopicRow[] {
    return this.db
      .prepare(
        `SELECT slug, title, h1, cluster,
                primary_query AS primaryQuery, secondary, volume, competition,
                intent, nursing_topic AS nursingTopic, angle, status,
                dedupe_of AS dedupeOf, run_id AS runId, created_at AS createdAt
         FROM topic
         WHERE status IN ('planned', 'failed')
         ORDER BY volume DESC
         LIMIT ?`,
      )
      .all(limit) as unknown as TopicRow[];
  }

  setTopicStatus(slug: string, status: TopicStatus, dedupeOf?: string) {
    this.db
      .prepare(`UPDATE topic SET status = ?, dedupe_of = COALESCE(?, dedupe_of) WHERE slug = ?`)
      .run(status, dedupeOf ?? null, slug);
  }

  /** Reset rows stranded in `drafting` by a killed run, so they can be retried. */
  releaseStranded(): number {
    const r = this.db
      .prepare(`UPDATE topic SET status = 'planned' WHERE status = 'drafting'`)
      .run();
    return Number(r.changes ?? 0);
  }

  topicSlugs(): Set<string> {
    const rows = this.db.prepare(`SELECT slug FROM topic`).all() as unknown as {
      slug: string;
    }[];
    return new Set(rows.map((r) => r.slug));
  }

  /* --------------------------------------------------------------- guides */

  putGuide(g: GuideRow) {
    this.db
      .prepare(
        `INSERT INTO guide (slug, title, h1, cluster, short_answer, sections,
                            faqs, minutes, words, nursing_topic, read_next,
                            model, status, error, sanity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title, h1 = excluded.h1, cluster = excluded.cluster,
           short_answer = excluded.short_answer, sections = excluded.sections,
           faqs = excluded.faqs, minutes = excluded.minutes, words = excluded.words,
           nursing_topic = excluded.nursing_topic, read_next = excluded.read_next,
           model = excluded.model, status = excluded.status, error = excluded.error,
           updated_at = excluded.updated_at`,
      )
      .run(
        g.slug, g.title, g.h1, g.cluster, g.shortAnswer, g.sections, g.faqs,
        g.minutes, g.words, g.nursingTopic, g.readNext, g.model, g.status,
        g.error, g.sanityId, g.createdAt, g.updatedAt,
      );
  }

  markPublished(slug: string, sanityId: string) {
    this.db
      .prepare(
        `UPDATE guide SET status = 'published', sanity_id = ?, updated_at = ? WHERE slug = ?`,
      )
      .run(sanityId, new Date().toISOString(), slug);
    this.setTopicStatus(slug, "published");
  }

  guides(status?: string, limit = 100_000): GuideRow[] {
    const where = status ? `WHERE status = ?` : ``;
    const args = status ? [status, limit] : [limit];
    return this.db
      .prepare(
        `SELECT slug, title, h1, cluster, short_answer AS shortAnswer, sections,
                faqs, minutes, words, nursing_topic AS nursingTopic,
                read_next AS readNext, model, status, error,
                sanity_id AS sanityId, created_at AS createdAt,
                updated_at AS updatedAt
         FROM guide ${where} ORDER BY created_at LIMIT ?`,
      )
      .all(...args) as unknown as GuideRow[];
  }

  /* ------------------------------------------------------------ reporting */

  counts(): Record<string, number> {
    const rows = this.db
      .prepare(
        `SELECT 'topic:' || status AS k, COUNT(*) AS n FROM topic GROUP BY status
         UNION ALL
         SELECT 'guide:' || status, COUNT(*) FROM guide GROUP BY status
         UNION ALL
         SELECT 'keyword', COUNT(*) FROM keyword`,
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
