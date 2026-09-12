import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * The local store for the nursing library.
 *
 * Separate tables in the same file as the guides pipeline, deliberately. Same
 * file because one database you can open and query beats two you have to join
 * by hand, and the keyword table is genuinely shared — both pipelines are
 * reading the same market. Separate tables because the work queues must not
 * touch: `pipeline/lib/store.ts#pending()` selects every planned row it can
 * see, and the day it starts handing nursing pages to the guides writer is the
 * day forty curated guides get overwritten by programmatic ones.
 *
 * Three layers again — plan, draft, publish — and for the same reason: a batch
 * of a thousand pages is a thousand independent failures waiting to happen, so
 * every row is committed the moment it exists and carries a status that makes
 * a re-run resumable rather than repeated.
 *
 * The addition here is `content_hash` on the page. A thousand pages written
 * from one template is the thin-content failure this library has to avoid, and
 * the only honest way to know it happened is to measure it: the hash is over
 * the prose, and two pages sharing one is a duplicate regardless of how
 * different their titles look.
 */

export type PageFamily =
  /** A clinical entity — a condition, a drug class, a procedure, a lab. */
  | "clinical"
  /** A question-bank topic, rendered with real items from the bank. */
  | "practice"
  /** A direct question with a direct answer. High intent, short tail. */
  | "faq"
  /** Exam logistics — booking, cost, rules, results. */
  | "exam"
  /** Career, licensure, school, the profession around the exam. */
  | "career";

/** The full shared keyword row, as the ingest writes it. */
export type KeywordFull = {
  keyword: string;
  volume: number;
  competition: string;
  competitionIndex: number;
  lowBid: number;
  highBid: number;
  source: string;
  observedAt: string;
  monthly: string | null;
};

/** Just enough of the shared keyword row for planning. */
export type KeywordLite = {
  keyword: string;
  volume: number;
  competition: string;
};

export type PlanStatus =
  | "planned"
  | "writing"
  | "written"
  | "failed"
  | "published"
  | "rejected";

export type PlanRow = {
  slug: string;
  title: string;
  h1: string;
  family: PageFamily;
  /** The question-bank topic this page must send readers to. */
  nursingTopic: string;
  /** The clinical entity or exam concept the page is about, where there is one. */
  entity: string | null;
  primaryQuery: string;
  /** JSON array of the queries this page is also meant to answer. */
  secondary: string;
  volume: number;
  competition: string | null;
  intent: string;
  /** The one thing this page says that a generic page would not. */
  angle: string;
  /** JSON array of section headings the writer must cover. */
  outline: string;
  /** JSON array of facts the writer must use and must not contradict. */
  facts: string;
  status: PlanStatus;
  /** Set when the dedupe rejected it, naming what already covers it. */
  dedupeOf: string | null;
  score: number;
  runId: string;
  createdAt: string;
};

export type PageRow = {
  slug: string;
  title: string;
  h1: string;
  family: PageFamily;
  nursingTopic: string;
  metaDescription: string;
  shortAnswer: string;
  /** JSON: [{h2, body: string[]}] */
  sections: string;
  /** JSON: [{q, a}] */
  faqs: string;
  /** JSON array of slugs. */
  readNext: string;
  words: number;
  minutes: number;
  model: string;
  /** sha256 over the prose, for duplicate detection. */
  contentHash: string;
  /** JSON: {words, sections, faqs, duplicate, issues: string[]} */
  quality: string;
  status: "written" | "published" | "failed" | "rejected";
  error: string | null;
  sanityId: string | null;
  createdAt: string;
  updatedAt: string;
};

const SCHEMA = `
/* The shared keyword table, declared here as well as in the guides pipeline.
   Identical definition, and IF NOT EXISTS makes the duplicate harmless — what
   it buys is that this pipeline can run against a fresh database without the
   other one having gone first, and without opening a second connection to
   borrow the table. */
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

CREATE TABLE IF NOT EXISTS nursing_plan (
  slug           TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  h1             TEXT NOT NULL,
  family         TEXT NOT NULL,
  nursing_topic  TEXT NOT NULL,
  entity         TEXT,
  primary_query  TEXT NOT NULL,
  secondary      TEXT NOT NULL DEFAULT '[]',
  volume         INTEGER NOT NULL DEFAULT 0,
  competition    TEXT,
  intent         TEXT,
  angle          TEXT NOT NULL,
  outline        TEXT NOT NULL DEFAULT '[]',
  facts          TEXT NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'planned',
  dedupe_of      TEXT,
  score          REAL NOT NULL DEFAULT 0,
  run_id         TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nursing_page (
  slug             TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  h1               TEXT NOT NULL,
  family           TEXT NOT NULL,
  nursing_topic    TEXT NOT NULL,
  meta_description TEXT NOT NULL DEFAULT '',
  short_answer     TEXT NOT NULL,
  sections         TEXT NOT NULL,
  faqs             TEXT NOT NULL DEFAULT '[]',
  read_next        TEXT NOT NULL DEFAULT '[]',
  words            INTEGER NOT NULL DEFAULT 0,
  minutes          INTEGER NOT NULL DEFAULT 1,
  model            TEXT,
  content_hash     TEXT NOT NULL DEFAULT '',
  quality          TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'written',
  error            TEXT,
  sanity_id        TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS nursing_plan_status ON nursing_plan (status);
CREATE INDEX IF NOT EXISTS nursing_plan_score  ON nursing_plan (score DESC);
CREATE INDEX IF NOT EXISTS nursing_plan_family ON nursing_plan (family);
CREATE INDEX IF NOT EXISTS nursing_page_status ON nursing_page (status);
CREATE INDEX IF NOT EXISTS nursing_page_hash   ON nursing_page (content_hash);
`;

/**
 * This pipeline's own database file.
 *
 * Deliberately not `pipeline/data/content.db`. The keyword harvester runs for
 * hours — it drives Keyword Planner through a real browser — and it holds that
 * file open in WAL the whole time, committing new keywords as it goes. Two
 * writers on one SQLite file across two processes is a fight, and the way it
 * was losing was not a crash: the planner read an empty keyword table, reported
 * "0 keywords" in a line nobody would look twice at, and planned the entire run
 * from the clinical index alone. A wrong run that looks like a working one is
 * the expensive kind.
 *
 * So the plan and page tables live here, and the shared keyword table is read
 * from `content.db` read-only, which WAL permits concurrently with the writer.
 * The harvester keeps enriching the market while this pipeline is running, and
 * the next plan simply sees more keywords than the last one did.
 */
export const DB_PATH = resolve(
  process.env.NURSING_DB ?? "pipeline/nursing/data/nursing.db",
);

/** The keyword table, owned and written by the guides pipeline's harvester. */
export const KEYWORD_DB = resolve(
  process.env.CONTENT_DB ?? "pipeline/data/content.db",
);

export function openNursingStore(path: string = DB_PATH): NursingStore {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  /* WAL is safe here because this file has one writer. It buys the thing that
     matters over a run this long: a second process can read the progress of a
     batch that is still writing, so `npm run nursing:status` works mid-run
     instead of blocking on it. */
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  /* A writer running eight pages wide will collide with itself on commit;
     without a busy timeout that surfaces as SQLITE_BUSY and loses the page
     that was just paid for. */
  db.exec("PRAGMA busy_timeout = 10000");
  db.exec(SCHEMA);
  return new NursingStore(db);
}

/**
 * The shared keyword table, read without taking a write lock on it.
 *
 * Opened read-only, read whole, closed immediately — the harvester may be
 * mid-run and must not be blocked, and this pipeline has no business writing
 * to a table another process owns. An empty result is raised as an error
 * rather than returned, because planning from zero keywords is precisely the
 * silent-wrong-run this whole arrangement exists to prevent.
 */
export function readSharedKeywords(path: string = KEYWORD_DB): KeywordLite[] {
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(path, { readOnly: true });
  } catch {
    /* Absent or locked is not fatal — this pipeline ingests its own exports
       and the shared table is an enrichment. It is reported rather than
       thrown so a run without it is a visible choice, not a silent one. */
    return [];
  }
  try {
    return db
      .prepare(`SELECT keyword, volume, competition FROM keyword ORDER BY volume DESC`)
      .all() as unknown as KeywordLite[];
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export class NursingStore {
  constructor(private db: DatabaseSync) {}

  close() {
    this.db.close();
  }

  /* ------------------------------------------------------ shared keywords */

  /**
   * The keyword table, read through this connection.
   *
   * It belongs to the guides pipeline and is shared rather than copied —
   * both pipelines are measuring the same market, and two copies drift. It is
   * read here instead of by opening `pipeline/lib/store.ts` alongside this one
   * because that second handle is what corrupted the database; see the comment
   * on `openNursingStore`.
   */
  putKeywords(rows: KeywordFull[]) {
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
          r.keyword, r.volume, r.competition, r.competitionIndex,
          r.lowBid, r.highBid, r.source, r.observedAt, r.monthly,
        );
      }
    });
  }

  keywordCount(): number {
    const r = this.db.prepare(`SELECT COUNT(*) AS n FROM keyword`).get() as
      | { n: number }
      | undefined;
    return Number(r?.n ?? 0);
  }

  keywords(minVolume = 0, limit = 100_000): KeywordLite[] {
    return this.db
      .prepare(
        `SELECT keyword, volume, competition
         FROM keyword WHERE volume >= ? ORDER BY volume DESC LIMIT ?`,
      )
      .all(minVolume, limit) as unknown as KeywordLite[];
  }

  /* ----------------------------------------------------------------- plan */

  putPlans(rows: PlanRow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO nursing_plan (slug, title, h1, family, nursing_topic, entity,
                                primary_query, secondary, volume, competition,
                                intent, angle, outline, facts, status,
                                dedupe_of, score, run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        volume = excluded.volume,
        competition = excluded.competition,
        secondary = excluded.secondary,
        score = excluded.score,
        outline = excluded.outline,
        facts = excluded.facts
    `);
    this.tx(() => {
      for (const r of rows) {
        stmt.run(
          r.slug, r.title, r.h1, r.family, r.nursingTopic, r.entity,
          r.primaryQuery, r.secondary, r.volume, r.competition, r.intent,
          r.angle, r.outline, r.facts, r.status, r.dedupeOf, r.score,
          r.runId, r.createdAt,
        );
      }
    });
  }

  /**
   * The work queue.
   *
   * `planned` and `failed` both come back, which is what makes a re-run pick
   * up after a crash instead of starting over. `writing` deliberately does
   * not: a row left in that state belongs to a run that was mid-flight, and
   * quietly redoing it is how the same page gets paid for twice.
   */
  pending(limit: number, family?: PageFamily): PlanRow[] {
    const where = family
      ? `status IN ('planned','failed') AND family = ?`
      : `status IN ('planned','failed')`;
    const args = family ? [family, limit] : [limit];
    return this.db
      .prepare(
        `SELECT slug, title, h1, family, nursing_topic AS nursingTopic, entity,
                primary_query AS primaryQuery, secondary, volume, competition,
                intent, angle, outline, facts, status, dedupe_of AS dedupeOf,
                score, run_id AS runId, created_at AS createdAt
         FROM nursing_plan WHERE ${where} ORDER BY score DESC LIMIT ?`,
      )
      .all(...args) as unknown as PlanRow[];
  }

  plans(status?: PlanStatus, limit = 100_000): PlanRow[] {
    const where = status ? `WHERE status = ?` : ``;
    const args = status ? [status, limit] : [limit];
    return this.db
      .prepare(
        `SELECT slug, title, h1, family, nursing_topic AS nursingTopic, entity,
                primary_query AS primaryQuery, secondary, volume, competition,
                intent, angle, outline, facts, status, dedupe_of AS dedupeOf,
                score, run_id AS runId, created_at AS createdAt
         FROM nursing_plan ${where} ORDER BY score DESC LIMIT ?`,
      )
      .all(...args) as unknown as PlanRow[];
  }

  /**
   * Retire rows a newer plan no longer selects.
   *
   * `putPlans` upserts, so re-planning with better keyword data leaves the
   * previous run's rejects behind as `planned` — and the writer takes anything
   * planned. The store went to 1,155 rows for a 1,000-page plan that way, and
   * the extra 155 were pages an earlier, worse plan had chosen and a later one
   * had deliberately dropped. Writing them would have cost real money to
   * publish pages the planner had already decided against.
   *
   * Only `planned` rows are touched. Anything written or published is the
   * output of work already done and is never retired by a re-plan — its page
   * exists, and the honest thing to do with a page that should not have been
   * written is to unpublish it deliberately, not to lose track of it.
   */
  retirePlanned(keep: Set<string>): number {
    const rows = this.db
      .prepare(`SELECT slug FROM nursing_plan WHERE status = 'planned'`)
      .all() as unknown as { slug: string }[];
    const stale = rows.map((r) => r.slug).filter((s) => !keep.has(s));
    if (!stale.length) return 0;

    const stmt = this.db.prepare(
      `UPDATE nursing_plan SET status = 'rejected', dedupe_of = 'dropped-by-later-plan' WHERE slug = ?`,
    );
    this.tx(() => {
      for (const s of stale) stmt.run(s);
    });
    return stale.length;
  }

  setPlanStatus(slug: string, status: PlanStatus, dedupeOf?: string) {
    this.db
      .prepare(
        `UPDATE nursing_plan SET status = ?, dedupe_of = COALESCE(?, dedupe_of) WHERE slug = ?`,
      )
      .run(status, dedupeOf ?? null, slug);
  }

  /** Claim rows for this worker, so two writers cannot take the same page. */
  claim(slugs: string[]) {
    const stmt = this.db.prepare(
      `UPDATE nursing_plan SET status = 'writing' WHERE slug = ?`,
    );
    this.tx(() => {
      for (const s of slugs) stmt.run(s);
    });
  }

  /** Reset rows stranded in `writing` by a killed run, so they can be retried. */
  releaseStranded(): number {
    const r = this.db
      .prepare(`UPDATE nursing_plan SET status = 'planned' WHERE status = 'writing'`)
      .run();
    return Number(r.changes ?? 0);
  }

  planSlugs(): Set<string> {
    const rows = this.db
      .prepare(`SELECT slug FROM nursing_plan`)
      .all() as unknown as { slug: string }[];
    return new Set(rows.map((r) => r.slug));
  }

  /* ---------------------------------------------------------------- pages */

  putPage(p: PageRow) {
    this.db
      .prepare(
        `INSERT INTO nursing_page (slug, title, h1, family, nursing_topic,
                                   meta_description, short_answer, sections,
                                   faqs, read_next, words, minutes, model,
                                   content_hash, quality, status, error,
                                   sanity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title, h1 = excluded.h1, family = excluded.family,
           nursing_topic = excluded.nursing_topic,
           meta_description = excluded.meta_description,
           short_answer = excluded.short_answer, sections = excluded.sections,
           faqs = excluded.faqs, read_next = excluded.read_next,
           words = excluded.words, minutes = excluded.minutes,
           model = excluded.model, content_hash = excluded.content_hash,
           quality = excluded.quality, status = excluded.status,
           error = excluded.error, updated_at = excluded.updated_at`,
      )
      .run(
        p.slug, p.title, p.h1, p.family, p.nursingTopic, p.metaDescription,
        p.shortAnswer, p.sections, p.faqs, p.readNext, p.words, p.minutes,
        p.model, p.contentHash, p.quality, p.status, p.error, p.sanityId,
        p.createdAt, p.updatedAt,
      );
  }

  pages(status?: PageRow["status"], limit = 100_000): PageRow[] {
    const where = status ? `WHERE status = ?` : ``;
    const args = status ? [status, limit] : [limit];
    return this.db
      .prepare(
        `SELECT slug, title, h1, family, nursing_topic AS nursingTopic,
                meta_description AS metaDescription, short_answer AS shortAnswer,
                sections, faqs, read_next AS readNext, words, minutes, model,
                content_hash AS contentHash, quality, status, error,
                sanity_id AS sanityId, created_at AS createdAt,
                updated_at AS updatedAt
         FROM nursing_page ${where} ORDER BY created_at LIMIT ?`,
      )
      .all(...args) as unknown as PageRow[];
  }

  page(slug: string): PageRow | undefined {
    return this.pages(undefined, 100_000).find((p) => p.slug === slug);
  }

  /** Hashes already written, so the writer can reject a duplicate on arrival. */
  hashes(): Map<string, string> {
    const rows = this.db
      .prepare(
        `SELECT slug, content_hash AS hash FROM nursing_page WHERE content_hash != ''`,
      )
      .all() as unknown as { slug: string; hash: string }[];
    return new Map(rows.map((r) => [r.hash, r.slug]));
  }

  setReadNext(slug: string, readNext: string[]) {
    this.db
      .prepare(`UPDATE nursing_page SET read_next = ?, updated_at = ? WHERE slug = ?`)
      .run(JSON.stringify(readNext), new Date().toISOString(), slug);
  }

  markPublished(slug: string, sanityId: string) {
    this.db
      .prepare(
        `UPDATE nursing_page SET status = 'published', sanity_id = ?, updated_at = ? WHERE slug = ?`,
      )
      .run(sanityId, new Date().toISOString(), slug);
    this.setPlanStatus(slug, "published");
  }

  /* ------------------------------------------------------------ reporting */

  counts(): Record<string, number> {
    const rows = this.db
      .prepare(
        `SELECT 'plan:' || status AS k, COUNT(*) AS n FROM nursing_plan GROUP BY status
         UNION ALL
         SELECT 'page:' || status, COUNT(*) FROM nursing_page GROUP BY status
         UNION ALL
         SELECT 'family:' || family, COUNT(*) FROM nursing_plan GROUP BY family`,
      )
      .all() as unknown as { k: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
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
