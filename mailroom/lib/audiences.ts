import type { Contact } from "./db";

/**
 * Lists built from what people did, instead of from a CSV.
 *
 * Two sources, one identity. Supabase holds the email (auth.users) and the
 * product state (profiles, streaks, orders). PostHog holds the behaviour
 * (every event, every cohort) but no email at all — none of its persons carry
 * one. What joins them is that the app identifies PostHog persons by their
 * Supabase user id, so a PostHog audience is "these person ids", resolved to
 * addresses through Supabase.
 *
 * Supabase is read over its HTTP APIs with the project's secret key: the Auth
 * admin API for emails, PostgREST for the tables. Presets load the few tables
 * they need into memory and filter there, because PostgREST can't express
 * "started checkout but no paid order" as one request. That's fine at this
 * size (hundreds to tens of thousands of users). Only GETs are ever sent.
 *
 * Custom SQL needs a real Postgres connection string instead, and runs inside
 * a READ ONLY transaction with a timeout.
 */

export type DbKey = "nursia" | "prepclever";

export type AudienceDef =
  | { source: "supabase"; db: DbKey; preset: string; params: Record<string, string>; includeInternal?: boolean }
  | { source: "sql"; db: DbKey; sql: string }
  | {
      source: "posthog";
      db: DbKey;
      mode: "event" | "cohort";
      event?: string;
      minCount?: number;
      days?: number;
      notEvent?: string;
      cohortId?: number;
      includeInternal?: boolean;
    };

export type AudienceResult = {
  contacts: Contact[];
  matched: number;
  dropped: { reason: string; count: number }[];
};

const MAX_ROWS = 50_000;
const SUFFIX: Record<DbKey, string> = { nursia: "NURSIA", prepclever: "PREPCLEVER" };

/* ── Supabase over HTTP ───────────────────────────────────────────────── */

export function rest(db: DbKey) {
  const url = process.env[`SUPABASE_URL_${SUFFIX[db]}`]?.replace(/\/$/, "");
  const key = process.env[`SUPABASE_SECRET_KEY_${SUFFIX[db]}`];
  if (!url || !key) throw new Error(`Set SUPABASE_URL_${SUFFIX[db]} and SUPABASE_SECRET_KEY_${SUFFIX[db]} in .env.local`);
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

export async function getJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/** Every row of a table, 1000 at a time (PostgREST's default page cap). */
export async function table<T>(db: DbKey, name: string, query: string): Promise<T[]> {
  const { url, headers } = rest(db);
  const out: T[] = [];
  for (let from = 0; from < 500_000; from += 1000) {
    const page = (await getJson(`${url}/rest/v1/${name}?${query}`, { ...headers, Range: `${from}-${from + 999}`, "Range-Unit": "items" })) as T[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

export type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
  is_anonymous?: boolean;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string };
};

export async function authUsers(db: DbKey) {
  const { url, headers } = rest(db);
  const out: AuthUser[] = [];
  for (let page = 1; page < 500; page++) {
    const body = (await getJson(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, headers)) as { users: AuthUser[] };
    out.push(...body.users);
    if (body.users.length < 1000) break;
  }
  return out;
}

type Profile = {
  id: string;
  full_name: string | null;
  user_state: string | null;
  created_at: string;
  last_seen_at: string | null;
  exam_date: string | null;
  is_internal: boolean | null;
  has_completed_onboarding: boolean | null;
  questions_answered_count?: number | null;
  exam_track?: string | null;
  ngn_daily_goal?: number | null;
  selected_exam_series_id?: string | null;
};

/* exam_* are filled from exam_series for PrepClever, which covers many exams. */
export type User = Profile & { email: string; exam_title?: string; exam_code?: string };

/* The PrepClever schema is older: no question counter, no exam track. */
const PROFILE_COLS: Record<DbKey, string> = {
  nursia: "id,full_name,user_state,created_at,last_seen_at,exam_date,is_internal,has_completed_onboarding,questions_answered_count,exam_track,ngn_daily_goal",
  prepclever: "id,full_name,user_state,created_at,last_seen_at,exam_date,is_internal,has_completed_onboarding,selected_exam_series_id",
};

export type Extra = "streaks" | "subs" | "commerce" | "paidOrders" | "practised";

export type Snapshot = {
  users: User[];
  streaks?: Map<string, { current_streak: number; last_activity_date: string | null }>;
  subs?: Set<string>;
  commerce?: Map<string, { event_name: string; claimed_at: string; order_ref: string | null }[]>;
  paidOrders?: Set<string>;
  practised?: Set<string>;
};

/* One snapshot per database for a minute, so previewing then saving doesn't
   pull everything twice. */
const cache = new Map<DbKey, { at: number; snap: Snapshot }>();

export async function snapshot(db: DbKey, needs: Extra[]): Promise<Snapshot> {
  let hit = cache.get(db);
  if (!hit || Date.now() - hit.at > 60_000) {
    const [auth, profiles] = await Promise.all([authUsers(db), table<Profile>(db, "profiles", `select=${PROFILE_COLS[db]}`)]);
    const emails = new Map(auth.filter((u) => u.email && !u.is_anonymous).map((u) => [u.id, u.email!]));
    const exams = db === "prepclever"
      ? new Map((await table<{ id: string; code: string; title: string }>(db, "exam_series", "select=id,code,title")).map((e) => [e.id, e]))
      : new Map<string, { id: string; code: string; title: string }>();
    const users: User[] = profiles.filter((p) => emails.has(p.id)).map((p) => {
      const ex = p.selected_exam_series_id ? exams.get(p.selected_exam_series_id) : undefined;
      return { ...p, email: emails.get(p.id)!, exam_title: ex?.title, exam_code: ex?.code };
    });
    hit = { at: Date.now(), snap: { users } };
    cache.set(db, hit);
  }
  const s = hit.snap;
  const now = new Date().toISOString();
  await Promise.all(
    needs.map(async (need) => {
      if (s[need]) return;
      if (need === "streaks") {
        const rows = await table<{ user_id: string; current_streak: number; last_activity_date: string | null }>(db, "user_streaks", "select=user_id,current_streak,last_activity_date");
        s.streaks = new Map(rows.map((r) => [r.user_id, r]));
      } else if (need === "subs") {
        const rows = await table<{ user_id: string; current_period_end: string | null }>(db, "subscriptions", "select=user_id,current_period_end&status=eq.active");
        s.subs = new Set(rows.filter((r) => !r.current_period_end || r.current_period_end > now).map((r) => r.user_id));
      } else if (need === "commerce") {
        const rows = await table<{ user_id: string; event_name: string; claimed_at: string; order_ref: string | null }>(db, "meta_commerce_events", "select=user_id,event_name,claimed_at,order_ref");
        s.commerce = new Map();
        for (const r of rows) (s.commerce.get(r.user_id) ?? s.commerce.set(r.user_id, []).get(r.user_id)!).push(r);
      } else if (need === "paidOrders") {
        const rows = await table<{ user_id: string }>(db, "dodo_orders", "select=user_id&status=eq.paid");
        s.paidOrders = new Set(rows.map((r) => r.user_id));
      } else if (need === "practised") {
        const rows = await table<{ user_id: string }>(db, "ngn_attempts", "select=user_id");
        s.practised = new Set(rows.map((r) => r.user_id));
      }
    }),
  );
  return s;
}

/* The app stores "Candidate" until someone types a name; that's a placeholder,
   not a name, and "Candidate, let's get you…" reads like a form letter. */
const PLACEHOLDER_NAMES = new Set(["candidate", "user", "student", "nurse", "test"]);
function realFirstName(full: string | null) {
  const first = (full ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || PLACEHOLDER_NAMES.has(first.toLowerCase()) || first.includes("@")) return "";
  return first[0].toUpperCase() + first.slice(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The merge fields every Supabase-sourced contact carries. */
export function fields(db: DbKey, u: User): Contact {
  const exam = u.exam_date ? new Date(`${u.exam_date}T00:00:00Z`) : null;
  const c: Contact = {
    email: u.email,
    user_id: u.id,
    first_name: realFirstName(u.full_name),
    full_name: u.full_name ?? "",
    user_state: u.user_state ?? "",
    signed_up: u.created_at.slice(0, 10),
    last_seen: u.last_seen_at?.slice(0, 10) ?? "",
    test_date: exam ? `${String(exam.getUTCDate()).padStart(2, "0")} ${MONTHS[exam.getUTCMonth()]} ${exam.getUTCFullYear()}` : "",
    /* Whole days from today (UTC), only while the date is still ahead. */
    days_to_exam: exam && exam.getTime() >= Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
      ? String(Math.round((exam.getTime() - Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) / 86400_000))
      : "",
  };
  if (db === "nursia") {
    c.questions_answered = String(u.questions_answered_count ?? 0);
    c.exam = u.exam_track === "RN" ? "NCLEX-RN" : u.exam_track === "PN" ? "NCLEX-PN" : "";
  } else {
    /* PrepClever spans NISM, IIBF, IRDAI and bank exams; say which one is theirs,
       and keep the id so their daily questions come from that exam. */
    c.exam = u.exam_title ?? "";
    c.exam_short = u.exam_code ?? "";
    c.exam_id = u.selected_exam_series_id ?? "";
  }
  return c;
}

export function configured() {
  const has = (db: DbKey) => !!(process.env[`SUPABASE_URL_${SUFFIX[db]}`] && process.env[`SUPABASE_SECRET_KEY_${SUFFIX[db]}`]);
  return {
    nursia: has("nursia"),
    prepclever: has("prepclever"),
    posthog: !!(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID),
    sql: { nursia: !!process.env.SUPABASE_DB_URL_NURSIA, prepclever: !!process.env.SUPABASE_DB_URL_PREPCLEVER },
  };
}

export async function testConnection(db: DbKey) {
  cache.delete(db);
  const s = await snapshot(db, []);
  return { users: s.users.length };
}

/* ── Presets ──────────────────────────────────────────────────────────── */

type Param = { key: string; label: string; type: "number" | "select"; default: string; options?: string[] };

type Preset = {
  id: string;
  label: string;
  description: string;
  dbs: DbKey[];
  template?: string;
  params: Param[];
  needs: Extra[];
  /** false to leave someone out, or extra merge fields to add when they're in. */
  match: (u: User, s: Snapshot, p: Record<string, string>) => false | Record<string, string>;
};

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const DAY = 86400_000;
const today = () => new Date().toISOString().slice(0, 10);
const daysFromToday = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

export const PRESETS: Preset[] = [
  {
    id: "all",
    label: "All users",
    description: "Everyone with an email. Optionally only recent signups.",
    dbs: ["nursia", "prepclever"],
    params: [{ key: "days", label: "Signed up in the last N days (0 = ever)", type: "number", default: "0" }],
    needs: [],
    match: (u, _s, p) => (num(p.days, 0) === 0 || u.created_at > ago(num(p.days, 0) * DAY)) && {},
  },
  {
    id: "state",
    label: "By lifecycle state",
    description: "profiles.user_state as the app computes it: new, current, lapsed or churned.",
    dbs: ["nursia", "prepclever"],
    params: [{ key: "state", label: "State", type: "select", default: "lapsed", options: ["new", "current", "lapsed", "churned"] }],
    needs: [],
    match: (u, _s, p) => u.user_state === (p.state || "lapsed") && {},
  },
  {
    id: "not_onboarded",
    label: "Signed up, never finished onboarding",
    description: "Account exists but onboarding was never completed, at least N hours after signup.",
    dbs: ["nursia", "prepclever"],
    template: "nursia-onboarding-welcome",
    params: [{ key: "hours", label: "At least N hours since signup", type: "number", default: "24" }],
    needs: [],
    match: (u, _s, p) => !u.has_completed_onboarding && u.created_at < ago(num(p.hours, 24) * 3600_000) && {},
  },
  {
    id: "no_practice",
    label: "Onboarded, hasn't answered a question",
    description: "Finished onboarding but has no answered questions and no NGN attempts — the activation gap.",
    dbs: ["nursia"],
    template: "nursia-activation-diagnostic",
    params: [{ key: "hours", label: "At least N hours since signup", type: "number", default: "24" }],
    needs: ["practised"],
    match: (u, s, p) =>
      !!u.has_completed_onboarding &&
      !(u.questions_answered_count ?? 0) &&
      !s.practised!.has(u.id) &&
      u.created_at < ago(num(p.hours, 24) * 3600_000) && {},
  },
  {
    id: "inactive",
    label: "Gone quiet",
    description: "Last seen between N and M days ago — cold enough to need a nudge, not so cold it's pointless.",
    dbs: ["nursia", "prepclever"],
    params: [
      { key: "days", label: "Not seen for at least N days", type: "number", default: "7" },
      { key: "max", label: "…but seen within M days", type: "number", default: "60" },
    ],
    needs: [],
    match: (u, _s, p) =>
      !!u.last_seen_at && u.last_seen_at < ago(num(p.days, 7) * DAY) && u.last_seen_at > ago(num(p.max, 60) * DAY) && {},
  },
  {
    id: "streak",
    label: "On a streak",
    description: "Active yesterday or today with a current streak of at least N days. Fills {{streak_days}}.",
    dbs: ["nursia", "prepclever"],
    template: "nursia-daily-question",
    params: [{ key: "min", label: "Streak of at least N days", type: "number", default: "1" }],
    needs: ["streaks"],
    match: (u, s, p) => {
      const st = s.streaks!.get(u.id);
      if (!st || st.current_streak < num(p.min, 1) || !st.last_activity_date || st.last_activity_date < daysFromToday(-1)) return false;
      return { streak_days: String(st.current_streak) };
    },
  },
  {
    id: "checkout_abandoned",
    label: "Started checkout, didn't pay",
    description: "An InitiateCheckout in the last N days, no Purchase/Subscribe, no paid order, no active plan.",
    dbs: ["nursia"],
    template: "nursia-cart-recovery",
    params: [{ key: "days", label: "Checkout started in the last N days", type: "number", default: "14" }],
    needs: ["commerce", "paidOrders", "subs"],
    match: (u, s, p) => {
      const ev = s.commerce!.get(u.id) ?? [];
      const since = ago(num(p.days, 14) * DAY);
      const checkouts = ev.filter((e) => e.event_name === "InitiateCheckout" && e.claimed_at > since).sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));
      if (!checkouts.length) return false;
      if (ev.some((e) => e.event_name === "Purchase" || e.event_name === "Subscribe")) return false;
      if (s.paidOrders!.has(u.id) || s.subs!.has(u.id)) return false;
      return { cart_id: checkouts[0].order_ref ?? "" };
    },
  },
  {
    id: "paywall_no_checkout",
    label: "Saw the paywall, never started checkout",
    description: "A paywall view (ViewContent) in the last N days with no checkout started and no active plan.",
    dbs: ["nursia"],
    params: [{ key: "days", label: "Paywall seen in the last N days", type: "number", default: "14" }],
    needs: ["commerce", "subs"],
    match: (u, s, p) => {
      const ev = s.commerce!.get(u.id) ?? [];
      const since = ago(num(p.days, 14) * DAY);
      return ev.some((e) => e.event_name === "ViewContent" && e.claimed_at > since) &&
        !ev.some((e) => ["InitiateCheckout", "Purchase", "Subscribe"].includes(e.event_name)) &&
        !s.subs!.has(u.id) && {};
    },
  },
  {
    id: "subscribers",
    label: "Paying subscribers",
    description: "An active subscription that hasn't passed its period end.",
    dbs: ["nursia", "prepclever"],
    params: [],
    needs: ["subs"],
    match: (u, s) => s.subs!.has(u.id) && {},
  },
  {
    id: "free_users",
    label: "Free users (no active plan)",
    description: "Everyone without an active subscription.",
    dbs: ["nursia", "prepclever"],
    params: [],
    needs: ["subs"],
    match: (u, s) => !s.subs!.has(u.id) && {},
  },
  {
    id: "exam_soon",
    label: "Exam coming up",
    description: "An exam date set within the next N days. Fills {{test_date}}.",
    dbs: ["nursia", "prepclever"],
    params: [{ key: "days", label: "Exam within the next N days", type: "number", default: "30" }],
    needs: [],
    match: (u, _s, p) => !!u.exam_date && u.exam_date >= today() && u.exam_date <= daysFromToday(num(p.days, 30)) && {},
  },
];

/* ── Custom SQL ───────────────────────────────────────────────────────── */

/* Hosted Mailroom only reads the apps over their APIs; arbitrary SQL against
   production stays in the local tool (internal/email/tool), which has it. */
async function readOnlySql(_db: DbKey, _sql: string): Promise<Record<string, unknown>[]> {
  throw new Error("Custom SQL isn't available in hosted Mailroom. Use a segment, or the local tool for one-off queries.");
}

/* ── PostHog ──────────────────────────────────────────────────────────── */

function posthogEnv() {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const project = process.env.POSTHOG_PROJECT_ID;
  const host = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "");
  if (!key || !project) throw new Error("Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID in .env.local");
  return { key, project, host };
}

export async function hogql(query: string) {
  const { key, project, host } = posthogEnv();
  const res = await fetch(`${host}/api/projects/${project}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${body.detail ?? body.error ?? "query failed"}`);
  return body.results as unknown[][];
}

/** HogQL string literal. Event names come from a dropdown, but quote them anyway. */
export const lit = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const int = (v: unknown, d: number, max: number) => Math.min(max, Math.max(0, Math.floor(Number(v)) || d));

export async function posthogEvents() {
  const rows = await hogql(
    `select event, count() as c, uniq(person_id) as people from events
      where timestamp > now() - interval 30 day group by event order by c desc limit 200`,
  );
  return rows.map(([event, count, people]) => ({ event: String(event), count: Number(count), people: Number(people) }));
}

export async function posthogCohorts() {
  const { key, project, host } = posthogEnv();
  const res = await fetch(`${host}/api/projects/${project}/cohorts/?limit=200`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`PostHog ${res.status} listing cohorts`);
  const body = (await res.json()) as { results: { id: number; name: string; count: number | null; deleted: boolean }[] };
  return body.results.filter((c) => !c.deleted).map((c) => ({ id: c.id, name: c.name, count: c.count }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** person -> every distinct id it has ever used; the Supabase id is among them once they've signed in. */
async function posthogPeople(def: Extract<AudienceDef, { source: "posthog" }>) {
  let persons: string;
  if (def.mode === "cohort") {
    persons = `select id as person_id, 0 as n from persons where id in cohort ${int(def.cohortId, 0, 1e12)}`;
  } else {
    if (!def.event) throw new Error("Pick an event");
    const days = int(def.days, 30, 3650);
    const not = def.notEvent
      ? `and person_id not in (select person_id from events where event = ${lit(def.notEvent)} and timestamp > now() - interval ${days} day)`
      : "";
    persons = `select person_id, count() as n from events
                where event = ${lit(def.event)} and timestamp > now() - interval ${days} day ${not}
                group by person_id having n >= ${int(def.minCount, 1, 1e9)}`;
  }
  const rows = await hogql(
    `select toString(e.person_id), e.n, groupArray(pdi.distinct_id)
       from (${persons}) as e
       join person_distinct_ids as pdi on pdi.person_id = e.person_id
      group by e.person_id, e.n
      limit ${MAX_ROWS}`,
  );
  /* Anonymous distinct ids are UUIDs too (v7, the SDK's own), so "the first
     UUID" isn't the user id. Every UUID-shaped id is checked against the
     Supabase users, and whichever one is a real account wins. */
  const candidates = new Map<string, { person: string; count: number }>();
  for (const [person, count, ids] of rows) {
    for (const x of ids as string[]) if (UUID.test(x)) candidates.set(x.toLowerCase(), { person: String(person), count: Number(count) });
  }
  return { candidates, persons: rows.length };
}

/* ── Running an audience ─────────────────────────────────────────────── */

/* Misspellings of the big inboxes. They hard-bounce, and bounces cost the
   whole domain's reputation, so they're dropped rather than sent and learned. */
const TYPO_DOMAINS = new Set([
  "gmai.com", "gmail.co", "gmial.com", "gamil.com", "gmail.con", "gmail.cm", "gmal.com", "gnail.com", "gmail.om",
  "yahoo.co", "yaho.com", "yahoo.con", "hotmail.co", "hotmial.com", "outlok.com", "outlook.co", "icloud.co",
]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* RFC 2606 reserved names: QA probes sign up with these and aren't always
   flagged is_internal. Nothing at them can receive mail. */
const RESERVED = /(^|\.)(example\.(com|org|net)|test|invalid|localhost|example)$/;

function clean(rows: Record<string, unknown>[]): AudienceResult {
  const seen = new Set<string>();
  const dropped = { invalid: 0, typo: 0, test: 0, duplicate: 0 };
  const contacts: Contact[] = [];
  for (const r of rows.slice(0, MAX_ROWS)) {
    const email = String(r.email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) { dropped.invalid++; continue; }
    if (TYPO_DOMAINS.has(email.split("@")[1])) { dropped.typo++; continue; }
    if (RESERVED.test(email.split("@")[1])) { dropped.test++; continue; }
    if (seen.has(email)) { dropped.duplicate++; continue; }
    seen.add(email);
    const c: Contact = { email };
    for (const [k, v] of Object.entries(r)) if (k !== "email" && v != null) c[k] = v instanceof Date ? v.toISOString() : String(v);
    contacts.push(c);
  }
  return {
    contacts,
    matched: rows.length,
    dropped: [
      { reason: "not a valid address", count: dropped.invalid },
      { reason: "misspelled domain (would bounce)", count: dropped.typo },
      { reason: "test address (example.com etc.)", count: dropped.test },
      { reason: "duplicate", count: dropped.duplicate },
    ].filter((d) => d.count),
  };
}

const visible = (u: User, includeInternal?: boolean) => includeInternal || !u.is_internal;

export async function runAudience(def: AudienceDef): Promise<AudienceResult> {
  if (def.source === "supabase") {
    const preset = PRESETS.find((p) => p.id === def.preset);
    if (!preset) throw new Error(`Unknown preset ${def.preset}`);
    if (!preset.dbs.includes(def.db)) throw new Error(`"${preset.label}" isn't available for ${def.db}`);
    const s = await snapshot(def.db, preset.needs);
    const rows: Contact[] = [];
    for (const u of s.users) {
      if (!visible(u, def.includeInternal)) continue;
      const extra = preset.match(u, s, def.params ?? {});
      if (extra) rows.push({ ...fields(def.db, u), ...extra });
    }
    return clean(rows);
  }

  if (def.source === "sql") {
    const sql = def.sql.trim().replace(/;\s*$/, "");
    if (!sql) throw new Error("Write a query first");
    if (sql.includes(";")) throw new Error("One statement only");
    const rows = await readOnlySql(def.db, `select * from (${sql}) as q limit ${MAX_ROWS}`);
    if (rows.length && !("email" in rows[0])) throw new Error('The query must return a column named "email"');
    return clean(rows);
  }

  const [{ candidates, persons }, s] = await Promise.all([posthogPeople(def), snapshot(def.db, [])]);
  /* One row per PostHog person, even if two of their ids somehow both match. */
  const perPerson = new Set<string>();
  const rows: Contact[] = [];
  for (const u of s.users) {
    const c = candidates.get(u.id.toLowerCase());
    if (!c || perPerson.has(c.person) || !visible(u, def.includeInternal)) continue;
    perPerson.add(c.person);
    rows.push({ ...fields(def.db, u), ...(def.mode === "event" ? { event_count: String(c.count) } : {}) });
  }
  const result = clean(rows);
  result.matched = persons;
  const unresolved = persons - rows.length;
  if (unresolved)
    result.dropped.unshift({ reason: `never signed in, not a ${def.db} user, internal, or no email`, count: unresolved });
  return result;
}

export function describe(def: AudienceDef) {
  if (def.source === "sql") return `Custom SQL · ${def.db}`;
  if (def.source === "supabase") {
    const p = PRESETS.find((x) => x.id === def.preset);
    const params = Object.entries(def.params ?? {}).map(([k, v]) => `${k}=${v}`).join(", ");
    return `Supabase · ${def.db} · ${p?.label ?? def.preset}${params ? ` (${params})` : ""}`;
  }
  if (def.mode === "cohort") return `PostHog cohort #${def.cohortId}`;
  return `PostHog · ${def.event} ≥${def.minCount ?? 1}× in ${def.days ?? 30}d${def.notEvent ? `, not ${def.notEvent}` : ""}`;
}

/** Would this address be dropped by an audience? Same rules, for flows. */
export function undeliverable(email: string) {
  const domain = email.split("@")[1] ?? "";
  return !EMAIL.test(email) || TYPO_DOMAINS.has(domain) || RESERVED.test(domain);
}
