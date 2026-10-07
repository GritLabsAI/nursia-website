import { authUsers, hogql, lit, table, type AuthUser, type DbKey } from "./audiences";
import { sql } from "./db";

/**
 * Everyone who signed up, with what they do and what we've sent them.
 *
 * Three sources, joined on the Supabase user id:
 * - the app's database: account, profile, sessions, every question attempt,
 *   practice sets and mocks — for both brands;
 * - PostHog: page views, screens and actions — Nursia only, since the PostHog
 *   key covers the NCLEX-Nursia project (its identified distinct id is the
 *   Supabase user id);
 * - Mailroom: every email sent to their address, with opens and clicks, and
 *   their answers to emailed questions.
 */

const DAY = 86400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const PROFILE_COLS: Record<DbKey, string> = {
  nursia: "id,full_name,user_state,created_at,last_seen_at,exam_date,is_internal,has_completed_onboarding,questions_answered_count,exam_track,newsletter_opt_in,paywall_view_count,paywall_last_viewed_at",
  prepclever: "id,full_name,user_state,created_at,last_seen_at,exam_date,is_internal,has_completed_onboarding,selected_exam_series_id",
};

/* Where each app keeps answered questions. */
const ATTEMPTS: Record<DbKey, { table: string; cols: string; at: string }> = {
  nursia: { table: "ngn_attempts", cols: "user_id,attempted_at,is_correct,score", at: "attempted_at" },
  prepclever: { table: "attempts", cols: "user_id,attempted_at,is_correct", at: "attempted_at" },
};

type Profile = Record<string, unknown> & { id: string };
type Session = { user_id: string; started_at: string; duration_ms: number | null; platform: string | null };
type Attempt = { user_id: string; attempted_at: string; is_correct: boolean | null };

function provider(a: AuthUser) {
  const p = a.app_metadata?.providers?.length ? a.app_metadata.providers : a.app_metadata?.provider ? [a.app_metadata.provider] : [];
  return p.length ? p : a.phone ? ["phone"] : a.email ? ["email"] : [];
}

function displayName(a: AuthUser, p?: Profile) {
  const n = String(p?.full_name ?? a.user_metadata?.full_name ?? a.user_metadata?.name ?? "").trim();
  return /^(candidate|user|student)$/i.test(n) ? "" : n;
}

/* ── the list ─────────────────────────────────────────────────────────── */

const listCache = new Map<DbKey, { at: number; rows: Promise<UserRow[]> }>();

export type UserRow = Awaited<ReturnType<typeof buildList>>[number];

export function listUsers(db: DbKey, fresh = false) {
  const hit = listCache.get(db);
  if (hit && !fresh && Date.now() - hit.at < 60_000) return hit.rows;
  const rows = buildList(db);
  listCache.set(db, { at: Date.now(), rows });
  rows.catch(() => listCache.delete(db));
  return rows;
}

async function buildList(db: DbKey) {
  const [auth, profiles, sessions, attempts, subs, emails, exams] = await Promise.all([
    authUsers(db) as Promise<AuthUser[]>,
    table<Profile>(db, "profiles", `select=${PROFILE_COLS[db]}`),
    table<Session>(db, "app_sessions", `select=user_id,started_at,duration_ms,platform&started_at=gte.${since(30)}`),
    table<Attempt>(db, ATTEMPTS[db].table, `select=user_id,attempted_at,is_correct&${ATTEMPTS[db].at}=gte.${since(30)}`),
    table<{ user_id: string; current_period_end: string | null }>(db, "subscriptions", "select=user_id,current_period_end&status=eq.active"),
    sql`select email, count(*) filter (where status = 'sent')::int as sent, count(opened_at)::int as opened, count(clicked_at)::int as clicked,
               max(sent_at) as last_sent, max(opened_at) as last_opened
          from sends group by email`,
    db === "prepclever" ? table<{ id: string; code: string }>(db, "exam_series", "select=id,code") : Promise.resolve([]),
  ]);
  const ph = db === "nursia" ? await posthogSummary(auth.map((a) => a.id)).catch(() => new Map()) : new Map();

  const prof = new Map(profiles.map((p) => [p.id, p]));
  const examCode = new Map(exams.map((e) => [e.id, e.code]));
  const now = new Date().toISOString();
  const paying = new Set(subs.filter((s) => !s.current_period_end || s.current_period_end > now).map((s) => s.user_id));
  const sess = new Map<string, { n: number; last: string; ms: number; platforms: Set<string> }>();
  for (const s of sessions) {
    const x = sess.get(s.user_id) ?? { n: 0, last: "", ms: 0, platforms: new Set<string>() };
    x.n++;
    x.ms += s.duration_ms ?? 0;
    if (s.started_at > x.last) x.last = s.started_at;
    if (s.platform) x.platforms.add(s.platform);
    sess.set(s.user_id, x);
  }
  const att = new Map<string, { n: number; right: number; last: string }>();
  for (const a of attempts) {
    const x = att.get(a.user_id) ?? { n: 0, right: 0, last: "" };
    x.n++;
    if (a.is_correct) x.right++;
    if (a.attempted_at > x.last) x.last = a.attempted_at;
    att.set(a.user_id, x);
  }
  const mail = new Map(emails.map((e) => [String(e.email), e]));

  return auth
    .filter((a) => !a.is_anonymous)
    .map((a) => {
      const p = prof.get(a.id);
      const s = sess.get(a.id);
      const t = att.get(a.id);
      const e = a.email ? mail.get(a.email.toLowerCase()) : undefined;
      const h = ph.get(a.id);
      const lastActive = [s?.last, t?.last, h?.last, p?.last_seen_at as string | undefined].filter(Boolean).sort().pop() ?? null;
      return {
        id: a.id,
        name: displayName(a, p),
        email: a.email ?? "",
        phone: a.phone ?? "",
        avatar: a.user_metadata?.avatar_url ?? a.user_metadata?.picture ?? "",
        providers: provider(a),
        createdAt: a.created_at ?? (p?.created_at as string) ?? null,
        lastSignIn: a.last_sign_in_at ?? null,
        verified: !!a.email_confirmed_at || !!a.phone,
        onboarded: !!p?.has_completed_onboarding,
        internal: !!p?.is_internal,
        state: (p?.user_state as string) ?? "",
        exam: db === "nursia" ? (p?.exam_track ? `NCLEX-${p.exam_track}` : "") : examCode.get(String(p?.selected_exam_series_id)) ?? "",
        paying: paying.has(a.id),
        lastActive,
        sessions30: Math.max(s?.n ?? 0, h?.sessions ?? 0),
        minutes30: Math.round((s?.ms ?? 0) / 60000),
        answered30: t?.n ?? 0,
        accuracy30: t?.n ? t.right / t.n : null,
        events30: h?.events ?? null,
        platforms: [...new Set([...(s?.platforms ?? []), ...(h?.platforms ?? [])])],
        emails: { sent: e?.sent ?? 0, opened: e?.opened ?? 0, clicked: e?.clicked ?? 0, lastSent: e?.last_sent ?? null, lastOpened: e?.last_opened ?? null },
      };
    })
    .sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
}

/** Per Supabase user id: events, sessions and last event in PostHog over 30 days. */
async function posthogSummary(ids: string[]) {
  const out = new Map<string, { events: number; sessions: number; last: string; platforms: string[] }>();
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400).map(lit).join(",");
    const rows = await hogql(`
      select pdi.distinct_id, count() as events, uniq(e.properties.$session_id) as sessions, max(e.timestamp) as last,
             groupUniqArray(if(e.properties.$lib = 'posthog-react-native', 'app', lower(toString(e.properties.$os)))) as platforms
        from events e
        join (select person_id, distinct_id from person_distinct_ids where distinct_id in (${chunk})) pdi on e.person_id = pdi.person_id
       where e.timestamp > now() - interval 30 day
       group by pdi.distinct_id`);
    for (const [id, events, sessions, last, platforms] of rows)
      out.set(String(id), { events: Number(events), sessions: Number(sessions), last: new Date(String(last)).toISOString(), platforms: (platforms as string[]).filter(Boolean) });
  }
  return out;
}

/* ── one person ───────────────────────────────────────────────────────── */

/* Events too noisy for a person's timeline; counted, not listed. */
const QUIET = ["$autocapture", "$web_vitals", "$pageleave", "$set", "$identify", "$opt_in", "$feature_flag_called", "$groupidentify", "Application Became Active", "Application Backgrounded", "session_ended"];

function eventLabel(event: string, path: string, screen: string) {
  /* Paths can be garbage (a broken link once produced a stringified function), so cap them. */
  path = path.length > 70 ? `${path.slice(0, 67)}…` : path;
  if (event === "$pageview") return `Viewed ${path || "a page"}`;
  if (event === "$screen") return `Opened ${screen || "a screen"}`;
  if (event === "$rageclick") return `Rage-clicked on ${path || "a page"}`;
  const words = event.replace(/^\$/, "").replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function userDetail(db: DbKey, uid: string) {
  const rows = await listUsers(db);
  const row = rows.find((r) => r.id === uid);
  if (!row) throw new Error("No such user");
  const email = row.email.toLowerCase();

  const [profile, sessions, attempts, practice, mocks, sends, answers, enrolled, ph] = await Promise.all([
    table<Profile>(db, "profiles", `select=*&id=eq.${uid}`).then((r) => r[0] ?? null),
    table<Session>(db, "app_sessions", `select=user_id,started_at,duration_ms,platform,app_version&user_id=eq.${uid}&order=started_at.desc&limit=200`),
    table<Attempt & { score?: number }>(db, ATTEMPTS[db].table, `select=${ATTEMPTS[db].cols}&user_id=eq.${uid}&order=${ATTEMPTS[db].at}.desc&limit=1000`),
    db === "prepclever"
      ? table<Record<string, unknown>>(db, "practice_sessions", `select=session_type,question_count,score_percent,started_at,completed_at,platform&user_id=eq.${uid}&order=started_at.desc&limit=100`)
      : table<Record<string, unknown>>(db, "ngn_session_history", `select=mode,item_count,score_percent,finished_at,duration_sec&user_id=eq.${uid}&order=finished_at.desc&limit=100`),
    db === "prepclever"
      ? table<Record<string, unknown>>(db, "mock_attempts", `select=status,score_percent,correct_count,incorrect_count,started_at,completed_at,passed&user_id=eq.${uid}&order=started_at.desc&limit=50`)
      : Promise.resolve([]),
    email
      ? sql`select s.campaign_id, c.doc->>'name' as name, c.doc->>'templateId' as template, s.status, s.sent_at, s.delivered_at, s.opened_at, s.clicked_at,
                   s.bounced_at, s.opens, s.clicks, c.doc->'flow' as flow
              from sends s join campaigns c on c.id = s.campaign_id where s.email = ${email} order by s.sent_at desc nulls last`
      : Promise.resolve([]),
    email ? sql`select question_id, choice, correct, answered_at, idx from quiz_answers where email = ${email} and brand = ${db} order by answered_at desc` : Promise.resolve([]),
    sql`select flow_id, first_seen, baseline, steps from enrollments where user_id = ${uid}`,
    db === "nursia" ? posthogPerson(uid).catch((e) => ({ error: (e as Error).message })) : Promise.resolve(null),
  ]);

  /* Daily activity, last 30 days: app answers + PostHog events. */
  const days: Record<string, { answered: number; events: number; emails: number }> = {};
  for (let i = 29; i >= 0; i--) days[new Date(Date.now() - i * DAY).toISOString().slice(0, 10)] = { answered: 0, events: 0, emails: 0 };
  for (const a of attempts) { const d = a.attempted_at?.slice(0, 10); if (days[d]) days[d].answered++; }
  if (ph && "daily" in ph) for (const [d, n] of ph.daily) if (days[d]) days[d].events = n;
  for (const s of sends) { const d = s.sent_at ? new Date(s.sent_at).toISOString().slice(0, 10) : ""; if (days[d]) days[d].emails++; }

  /* One timeline across everything, newest first. */
  type Item = { at: string; kind: "app" | "web" | "email" | "quiz" | "account"; title: string; detail?: string };
  const items: Item[] = [];
  if (row.createdAt) items.push({ at: row.createdAt, kind: "account", title: "Signed up", detail: row.providers.join(", ") });
  for (const s of sessions.slice(0, 100))
    items.push({ at: s.started_at, kind: "app", title: `Session on ${s.platform ?? "the app"}`, detail: s.duration_ms ? `${Math.max(1, Math.round(s.duration_ms / 60000))} min` : undefined });
  for (const p of practice.slice(0, 60)) {
    const at = String(p.completed_at ?? p.finished_at ?? p.started_at ?? "");
    if (at) items.push({ at, kind: "app", title: `Finished a ${String(p.session_type ?? p.mode ?? "practice").replace(/_/g, " ")} set`, detail: p.score_percent != null ? `${Math.round(Number(p.score_percent))}%` : undefined });
  }
  for (const m of mocks) {
    const at = String(m.completed_at ?? m.started_at ?? "");
    if (at) items.push({ at, kind: "app", title: m.completed_at ? "Finished a mock test" : "Started a mock test", detail: m.score_percent != null ? `${Math.round(Number(m.score_percent))}%${m.passed ? ", passed" : ""}` : undefined });
  }
  if (ph && "events" in ph) for (const e of ph.events) items.push({ at: e.at, kind: e.app ? "app" : "web", title: e.label, detail: e.where });
  for (const s of sends) {
    if (s.sent_at) items.push({ at: new Date(s.sent_at).toISOString(), kind: "email", title: `Sent "${s.name}"`, detail: s.flow ? "automatic" : undefined });
    if (s.opened_at) items.push({ at: new Date(s.opened_at).toISOString(), kind: "email", title: `Opened "${s.name}"`, detail: s.opens > 1 ? `${s.opens} times` : undefined });
    if (s.clicked_at) items.push({ at: new Date(s.clicked_at).toISOString(), kind: "email", title: `Clicked in "${s.name}"`, detail: s.clicks > 1 ? `${s.clicks} clicks` : undefined });
    if (s.bounced_at) items.push({ at: new Date(s.bounced_at).toISOString(), kind: "email", title: `"${s.name}" bounced` });
  }
  for (const q of answers) items.push({ at: new Date(q.answered_at).toISOString(), kind: "quiz", title: q.choice < 0 ? "Skipped an emailed question" : q.correct ? "Answered an emailed question correctly" : "Answered an emailed question wrongly" });
  items.sort((a, b) => b.at.localeCompare(a.at));

  const answered = attempts.length;
  const right = attempts.filter((a) => a.is_correct).length;
  return {
    brand: db,
    user: row,
    profile,
    behaviour: {
      answeredTotal: answered,
      accuracy: answered ? right / answered : null,
      sessions: sessions.length,
      minutes: Math.round(sessions.reduce((a, s) => a + (s.duration_ms ?? 0), 0) / 60000),
      activeDays30: Object.values(days).filter((d) => d.answered || d.events).length,
      practiceSets: practice.length,
      mocks: mocks.length,
      posthog: ph,
      days: Object.entries(days).map(([date, v]) => ({ date, ...v })),
    },
    email: {
      sends: sends.map((s) => ({ ...s, sent_at: s.sent_at && new Date(s.sent_at).toISOString(), opened_at: s.opened_at && new Date(s.opened_at).toISOString(), clicked_at: s.clicked_at && new Date(s.clicked_at).toISOString() })),
      quiz: { answered: answers.filter((a) => a.choice >= 0).length, right: answers.filter((a) => a.correct).length },
      flows: enrolled,
    },
    timeline: items.slice(0, 300),
  };
}

/** One person's last 30 days in PostHog: what they did, where, and how often. */
async function posthogPerson(uid: string) {
  const person = `(select person_id from person_distinct_ids where distinct_id = ${lit(uid)} limit 1)`;
  const quiet = QUIET.map(lit).join(",");
  const [events, daily, top, totals] = await Promise.all([
    hogql(`select timestamp, event, properties.$pathname, properties.$screen_name, properties.$lib, properties.$os
             from events where person_id = ${person} and timestamp > now() - interval 30 day and event not in (${quiet})
            order by timestamp desc limit 150`),
    hogql(`select toString(toDate(timestamp)) as d, count() from events where person_id = ${person} and timestamp > now() - interval 30 day group by d`),
    hogql(`select event, count() as n from events where person_id = ${person} and timestamp > now() - interval 30 day and event not in (${quiet}) group by event order by n desc limit 8`),
    hogql(`select count(), uniq(properties.$session_id), min(timestamp), max(timestamp) from events where person_id = ${person}`),
  ]);
  const [all, sessions, first, last] = totals[0] ?? [0, 0, null, null];
  return {
    url: `${(process.env.POSTHOG_HOST || "https://us.posthog.com").replace("://us.i.", "://us.")}/project/${process.env.POSTHOG_PROJECT_ID}/person/${encodeURIComponent(uid)}`,
    totalEvents: Number(all),
    sessions: Number(sessions),
    firstSeen: first ? new Date(String(first)).toISOString() : null,
    lastSeen: last ? new Date(String(last)).toISOString() : null,
    daily: daily.map(([d, n]) => [String(d), Number(n)] as [string, number]),
    top: top.map(([event, n]) => ({ label: eventLabel(String(event), "", ""), count: Number(n) })),
    events: events.map(([at, event, path, screen, lib, os]) => ({
      at: new Date(String(at)).toISOString(),
      label: eventLabel(String(event), String(path ?? ""), String(screen ?? "")),
      where: [lib === "posthog-react-native" ? "app" : "web", os].filter(Boolean).join(", "),
      app: lib === "posthog-react-native",
    })),
  };
}
