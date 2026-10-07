import { neon } from "@neondatabase/serverless";
import type { AudienceDef } from "./audiences";

/**
 * Mailroom's own records, in its Neon database (schema: scripts/migrate.mjs).
 *
 * The shapes match what the local tool kept in db.json, so the dashboard code
 * didn't have to change; only where they're stored did. A campaign is a JSON
 * document, while its recipients are rows in `sends`, because those are what
 * webhooks update one at a time and what the reports count.
 */

export const sql = neon(process.env.DATABASE_URL!);

export type Brand = "nursia" | "prepclever";
export type Contact = { email: string } & Record<string, string>;

export type ContactList = {
  id: string;
  name: string;
  createdAt: string;
  contacts: Contact[];
  source?: AudienceDef | null;
  refreshedAt?: string | null;
  hidden?: boolean;
};

export type ListMeta = Omit<ContactList, "contacts"> & { count: number; fields: string[] };

export type SendStatus = "queued" | "sent" | "failed" | "skipped" | "canceled";

export type Send = {
  email: string;
  status: SendStatus;
  contact?: Record<string, string>;
  resendId?: string;
  error?: string;
  sentAt?: string;
  lastEvent?: string;
  delivered?: string;
  opened?: string;
  clicked?: string;
  bounced?: string;
  complained?: string;
  opens?: number;
  clicks?: number;
};

export type Campaign = {
  id: string;
  name: string;
  templateId: string;
  brand: Brand;
  subject: string;
  from: string;
  replyTo?: string;
  listId: string;
  listIds?: string[];
  vars: Record<string, string>;
  scheduledAt?: string;
  status: "draft" | "sending" | "sent" | "failed" | "canceled";
  createdAt: string;
  sentAt?: string;
  error?: string;
  /** Set when a flow step sent this, so the flow page can total it per step. */
  flow?: { id: string; step: string };
  /** Spread the send across all the brand's mailboxes; each person always gets the same one. */
  rotate?: boolean;
  /** When a send that's waiting (a set start, the daily limit, the 6-hour gap) picks up again. */
  resumeAt?: string;
};

export type Suppression = { email: string; reason: "unsubscribed" | "bounced" | "complained" | "manual"; at: string; campaignId?: string };

export type BrandSettings = {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  postalAddress: string;
  website: string;
  instagramUrl: string;
  playStoreUrl: string;
  appStoreUrl: string;
};

export type StoredSettings = { siteUrl: string; brands: Record<Brand, BrandSettings> };
export type Settings = StoredSettings & { unsubSecret: string };

export type FlowState = {
  autoRun: boolean;
  params: Record<string, Record<string, string>>;
  running?: string;
  lastRunAt?: string;
  lastAutoResult?: string;
  /** When the flow first looked: everyone already onboarded then is never welcomed. */
  baselineAt?: string;
};

/** The registered office, printed in every footer until a brand sets its own. */
export const DEFAULT_POSTAL_ADDRESS = "HSR Layout, Bangalore South, Bengaluru 560102, Karnataka, India";

export const DEFAULT_SETTINGS: StoredSettings = {
  siteUrl: process.env.MAILROOM_URL ?? "",
  brands: {
    nursia: { fromName: "Nursia", fromEmail: "arpan@nursia.io", replyTo: "arpan@nursia.io", postalAddress: DEFAULT_POSTAL_ADDRESS, website: "https://nursia.io", instagramUrl: "https://www.instagram.com/nursia.io/", playStoreUrl: "", appStoreUrl: "" },
    prepclever: { fromName: "PrepClever", fromEmail: "arpan@prepclever.in", replyTo: "arpan@prepclever.in", postalAddress: DEFAULT_POSTAL_ADDRESS, website: "https://app.prepclever.in", instagramUrl: "", playStoreUrl: "", appStoreUrl: "" },
  },
};

export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);

/* ── settings ─────────────────────────────────────────────────────────── */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const [row] = await sql`select value from settings where key = ${key}`;
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown) {
  await sql`insert into settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb)
            on conflict (key) do update set value = excluded.value`;
}

export async function getSettings(): Promise<StoredSettings> {
  const s = (await getSetting<StoredSettings>("app")) ?? DEFAULT_SETTINGS;
  /* A saved blank address would otherwise beat the default and pause every automatic send. */
  const brand = (k: Brand) => {
    const b = { ...DEFAULT_SETTINGS.brands[k], ...s.brands?.[k] };
    return { ...b, postalAddress: b.postalAddress?.trim() || DEFAULT_POSTAL_ADDRESS };
  };
  return {
    siteUrl: s.siteUrl || DEFAULT_SETTINGS.siteUrl,
    brands: { nursia: brand("nursia"), prepclever: brand("prepclever") },
  };
}

/* ── mailboxes: the addresses an email can go out from ────────────────── */

/**
 * Each brand has one or more mailboxes and exactly one default. The default
 * is mirrored into the brand's fromName/fromEmail/replyTo, which is what the
 * automatic flows and the health checks read, so they follow it without
 * knowing mailboxes exist.
 */
export type Mailbox = { id: string; brand: Brand; name: string; email: string; replyTo: string; isDefault: boolean; createdAt: string };

export async function getMailboxes(): Promise<Mailbox[]> {
  const stored = await getSetting<Mailbox[]>("mailboxes");
  if (stored?.length) return stored;
  const s = await getSettings();
  return (["nursia", "prepclever"] as const).map((k) => ({
    id: `mbx_${k}`,
    brand: k,
    name: s.brands[k].fromName,
    email: s.brands[k].fromEmail,
    replyTo: s.brands[k].replyTo,
    isDefault: true,
    createdAt: new Date(0).toISOString(),
  }));
}

/** Saves the set, keeping one default per brand and the brand sender in step with it. */
export async function saveMailboxes(all: Mailbox[]) {
  const s = (await getSetting<StoredSettings>("app")) ?? (await getSettings());
  for (const k of ["nursia", "prepclever"] as const) {
    const mine = all.filter((m) => m.brand === k);
    if (!mine.length) continue;
    const def = mine.find((m) => m.isDefault) ?? mine[0];
    for (const m of mine) m.isDefault = m === def;
    s.brands = s.brands ?? ({} as StoredSettings["brands"]);
    s.brands[k] = { ...DEFAULT_SETTINGS.brands[k], ...s.brands[k], fromName: def.name, fromEmail: def.email, replyTo: def.replyTo || def.email };
  }
  await setSetting("mailboxes", all);
  await setSetting("app", s);
}

export const fromLineOf = (m: Pick<Mailbox, "name" | "email">) => (m.name ? `${m.name.replace(/[<>"]/g, "")} <${m.email}>` : m.email);

/* ── uploaded templates ───────────────────────────────────────────────── */

export type Asset = { mime: string; base64: string };

export type CustomTemplate = {
  id: string;
  brand: Brand;
  name: string;
  subject: string;
  purpose: string;
  html: string;
  /** Images uploaded with it, keyed by the path the HTML uses, e.g. "images/hero.png". */
  assets: Record<string, Asset>;
  /** Adds the unsubscribe link and postal address under the email when the HTML has none. */
  footer: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

let templatesTable: Promise<unknown> | undefined;
/* Created on first use too, so a deploy works before anyone runs db:migrate. */
const ensureTemplates = () =>
  (templatesTable ??= sql`create table if not exists templates (
     id text primary key, brand text not null, archived boolean not null default false,
     created_at timestamptz not null default now(), updated_at timestamptz not null default now(), doc jsonb not null)`.catch((e) => {
    templatesTable = undefined;
    throw e;
  }));

const rowToTemplate = (r: Record<string, unknown>): CustomTemplate => ({
  ...(r.doc as CustomTemplate),
  id: r.id as string,
  brand: r.brand as Brand,
  archived: !!r.archived,
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
});

export async function listCustomTemplates(includeArchived = false): Promise<CustomTemplate[]> {
  await ensureTemplates();
  const rows = await sql`select * from templates where ${includeArchived} or not archived order by updated_at desc`;
  return rows.map(rowToTemplate);
}

export async function getCustomTemplate(tid: string): Promise<CustomTemplate | undefined> {
  await ensureTemplates();
  const [r] = await sql`select * from templates where id = ${tid}`;
  return r ? rowToTemplate(r) : undefined;
}

export async function saveCustomTemplate(t: CustomTemplate) {
  await ensureTemplates();
  const { id: tid, brand, archived, createdAt, updatedAt: _u, ...doc } = t;
  await sql`insert into templates (id, brand, archived, created_at, updated_at, doc)
            values (${tid}, ${brand}, ${archived}, ${createdAt}, now(), ${JSON.stringify(doc)}::jsonb)
            on conflict (id) do update set brand = excluded.brand, archived = excluded.archived, updated_at = now(), doc = excluded.doc`;
}

export async function deleteCustomTemplate(tid: string) {
  await ensureTemplates();
  await sql`delete from templates where id = ${tid}`;
}

/* ── lists ────────────────────────────────────────────────────────────── */

type ListRow = { id: string; name: string; created_at: string; source: AudienceDef | null; refreshed_at: string | null; hidden: boolean };

const listMeta = (r: ListRow & { count: number; fields: string[] }): ListMeta => ({
  id: r.id,
  name: r.name,
  createdAt: iso(r.created_at)!,
  source: r.source,
  refreshedAt: iso(r.refreshed_at) ?? null,
  hidden: r.hidden,
  count: Number(r.count),
  fields: r.fields ?? [],
});

export async function listLists(includeHidden = false): Promise<ListMeta[]> {
  const rows = await sql`
    select id, name, created_at, source, refreshed_at, hidden,
           jsonb_array_length(contacts) as count,
           (select coalesce(jsonb_agg(distinct k), '[]'::jsonb) from jsonb_array_elements(contacts) c, jsonb_object_keys(c) k) as fields
      from lists where ${includeHidden} or not hidden
     order by coalesce(refreshed_at, created_at) desc`;
  return rows.map((r) => listMeta(r as ListRow & { count: number; fields: string[] }));
}

export async function getList(lid: string): Promise<ContactList | undefined> {
  const [r] = await sql`select * from lists where id = ${lid}`;
  if (!r) return undefined;
  return { id: r.id, name: r.name, createdAt: iso(r.created_at)!, source: r.source, refreshedAt: iso(r.refreshed_at) ?? null, hidden: r.hidden, contacts: r.contacts };
}

export async function getLists(ids: string[]): Promise<ContactList[]> {
  if (!ids.length) return [];
  const rows = await sql`select * from lists where id = any(${ids})`;
  const byId = new Map<string, ContactList>(
    rows.map((r) => [r.id as string, { id: r.id, name: r.name, createdAt: iso(r.created_at)!, source: r.source, refreshedAt: iso(r.refreshed_at) ?? null, hidden: r.hidden, contacts: r.contacts as Contact[] }]),
  );
  return ids.map((i) => byId.get(i)).filter((l): l is ContactList => !!l);
}

export async function saveList(l: ContactList) {
  await sql`insert into lists (id, name, created_at, source, refreshed_at, hidden, contacts)
            values (${l.id}, ${l.name}, ${l.createdAt}, ${l.source ? JSON.stringify(l.source) : null}::jsonb, ${l.refreshedAt ?? null}, ${!!l.hidden}, ${JSON.stringify(l.contacts)}::jsonb)
            on conflict (id) do update set name = excluded.name, source = excluded.source, refreshed_at = excluded.refreshed_at,
              hidden = excluded.hidden, contacts = excluded.contacts`;
}

export async function deleteList(lid: string) {
  await sql`delete from lists where id = ${lid}`;
}

/* ── campaigns ────────────────────────────────────────────────────────── */

function rowToCampaign(r: Record<string, unknown>): Campaign {
  return { ...(r.doc as Campaign), id: r.id as string, status: r.status as Campaign["status"], createdAt: iso(r.created_at)! };
}

export async function getCampaign(cid: string): Promise<Campaign | undefined> {
  const [r] = await sql`select * from campaigns where id = ${cid}`;
  return r ? rowToCampaign(r) : undefined;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await sql`select * from campaigns order by created_at desc`;
  return rows.map(rowToCampaign);
}

export async function saveCampaign(c: Campaign) {
  const { id: cid, status, createdAt, ...doc } = c;
  await sql`insert into campaigns (id, status, created_at, doc) values (${cid}, ${status}, ${createdAt}, ${JSON.stringify(doc)}::jsonb)
            on conflict (id) do update set status = excluded.status, doc = excluded.doc`;
}

export async function deleteCampaign(cid: string) {
  await sql`delete from campaigns where id = ${cid}`;
}

/* ── sends ────────────────────────────────────────────────────────────── */

function rowToSend(r: Record<string, unknown>): Send {
  return {
    email: r.email as string,
    status: r.status as SendStatus,
    contact: (r.contact as Record<string, string>) ?? undefined,
    resendId: (r.resend_id as string) ?? undefined,
    error: (r.error as string) ?? undefined,
    sentAt: iso(r.sent_at),
    lastEvent: (r.last_event as string) ?? undefined,
    delivered: iso(r.delivered_at),
    opened: iso(r.opened_at),
    clicked: iso(r.clicked_at),
    bounced: iso(r.bounced_at),
    complained: iso(r.complained_at),
    opens: Number(r.opens ?? 0),
    clicks: Number(r.clicks ?? 0),
  };
}

export async function getSends(cid: string): Promise<Send[]> {
  const rows = await sql`select * from sends where campaign_id = ${cid} order by email`;
  return rows.map(rowToSend);
}

export async function countSends(cid: string) {
  const [r] = await sql`select count(*)::int as n from sends where campaign_id = ${cid}`;
  return r.n as number;
}

/** One row per recipient, with the details their email is filled in from. */
export async function insertSends(cid: string, rows: { email: string; status: SendStatus; contact: Record<string, string> }[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = JSON.stringify(rows.slice(i, i + 500));
    await sql`insert into sends (campaign_id, email, status, contact)
              select ${cid}, x->>'email', x->>'status', x->'contact' from jsonb_array_elements(${chunk}::jsonb) x
              on conflict do nothing`;
  }
}

/**
 * Queued recipients of a campaign. With a gap, anyone who got any email from
 * us within their gap is left out for now, whichever campaigns or automations
 * the emails came from. Each person's gap sits between `gap.min` and `gap.max`
 * hours, fixed by their address, so a batch spreads out rather than everyone
 * becoming sendable at the same minute.
 */
export type Gap = { min: number; max: number };
const NO_GAP: Gap = { min: 0, max: 0 };

export async function queuedSends(cid: string, limit: number, gap: Gap = NO_GAP) {
  const lo = Math.round(gap.min * 60), spread = Math.round((gap.max - gap.min) * 60) + 1;
  const rows = gap.max
    ? await sql`select * from sends q where q.campaign_id = ${cid} and q.status = 'queued'
                  and not exists (select 1 from sends r where r.email = q.email and r.status = 'sent'
                                   and r.sent_at > now() - make_interval(mins => ${lo} + abs(hashtext(q.email)) % ${spread}))
                order by q.email limit ${limit}`
    : await sql`select * from sends where campaign_id = ${cid} and status = 'queued' order by email limit ${limit}`;
  return rows.map(rowToSend);
}

/** When the first person held back by their gap becomes sendable again. */
export async function nextGapRelease(cid: string, gap: Gap) {
  const lo = Math.round(gap.min * 60), spread = Math.round((gap.max - gap.min) * 60) + 1;
  const [r] = await sql`select min(r.sent_at + make_interval(mins => ${lo} + abs(hashtext(q.email)) % ${spread})) as at
                          from sends q join sends r on r.email = q.email and r.status = 'sent'
                         where q.campaign_id = ${cid} and q.status = 'queued'
                           and r.sent_at > now() - make_interval(mins => ${lo} + abs(hashtext(q.email)) % ${spread})`;
  return r?.at ? new Date(r.at).getTime() : null;
}

export async function markSent(cid: string, email: string, resendId: string) {
  await sql`update sends set status = 'sent', resend_id = ${resendId}, sent_at = now(), error = null where campaign_id = ${cid} and email = ${email}`;
}

export async function markFailed(cid: string, email: string, error: string) {
  await sql`update sends set status = 'failed', error = ${error} where campaign_id = ${cid} and email = ${email}`;
}

export async function markCanceled(cid: string, email: string) {
  await sql`update sends set status = 'canceled' where campaign_id = ${cid} and email = ${email}`;
}

/**
 * Records a delivery event against the send it belongs to. First-seen times
 * are sticky (a click implies the open, a later re-open doesn't undo a click),
 * and opens/clicks are counted every time, which polling could never do.
 */
export async function applyEvent(resendId: string, type: string, at: string) {
  const t = type.replace(/^email\./, "");
  const rows = await sql`
    update sends set
      last_event = ${t},
      delivered_at = case when ${t} in ('delivered','opened','clicked','complained') then coalesce(delivered_at, ${at}::timestamptz) else delivered_at end,
      opened_at    = case when ${t} in ('opened','clicked') then coalesce(opened_at, ${at}::timestamptz) else opened_at end,
      clicked_at   = case when ${t} = 'clicked' then coalesce(clicked_at, ${at}::timestamptz) else clicked_at end,
      bounced_at   = case when ${t} = 'bounced' then coalesce(bounced_at, ${at}::timestamptz) else bounced_at end,
      complained_at = case when ${t} = 'complained' then coalesce(complained_at, ${at}::timestamptz) else complained_at end,
      opens  = opens  + case when ${t} = 'opened' then 1 else 0 end,
      clicks = clicks + case when ${t} = 'clicked' then 1 else 0 end
    where resend_id = ${resendId}
    returning campaign_id, email`;
  return rows[0] as { campaign_id: string; email: string } | undefined;
}

export type Stats = ReturnType<typeof toStats>;

function toStats(r: Record<string, number>, unsubscribed: number) {
  const n = (k: string) => Number(r?.[k] ?? 0);
  const pct = (a: number, b: number) => (b ? a / b : null);
  const sent = n("sent"), delivered = n("delivered"), opened = n("opened"), clicked = n("clicked"), bounced = n("bounced");
  return {
    recipients: n("recipients"),
    queued: n("queued"),
    sent,
    failed: n("failed"),
    skipped: n("skipped"),
    delivered,
    opened,
    clicked,
    bounced,
    complained: n("complained"),
    unsubscribed,
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, delivered),
    clickRate: pct(clicked, delivered),
    clickToOpen: pct(clicked, opened),
    bounceRate: pct(bounced, sent),
    unsubRate: pct(unsubscribed, delivered),
  };
}

export async function statsFor(ids: string[]) {
  if (!ids.length) return new Map<string, Stats>();
  const rows = await sql`
    select campaign_id,
           count(*)::int as recipients,
           count(*) filter (where status = 'queued')::int as queued,
           count(*) filter (where status = 'sent')::int as sent,
           count(*) filter (where status = 'failed')::int as failed,
           count(*) filter (where status = 'skipped')::int as skipped,
           count(delivered_at)::int as delivered,
           count(opened_at)::int as opened,
           count(clicked_at)::int as clicked,
           count(bounced_at)::int as bounced,
           count(complained_at)::int as complained
      from sends where campaign_id = any(${ids}) group by campaign_id`;
  const unsub = await sql`select campaign_id, count(*)::int as n from suppressions where reason = 'unsubscribed' and campaign_id = any(${ids}) group by campaign_id`;
  const u = new Map(unsub.map((x) => [x.campaign_id as string, Number(x.n)]));
  const byId = new Map(rows.map((x) => [x.campaign_id as string, x as Record<string, number>]));
  return new Map(ids.map((i) => [i, toStats(byId.get(i) ?? {}, u.get(i) ?? 0)]));
}

/* ── suppressions ─────────────────────────────────────────────────────── */

export async function listSuppressions(): Promise<Suppression[]> {
  const rows = await sql`select * from suppressions order by at desc`;
  return rows.map((r) => ({ email: r.email, reason: r.reason, at: iso(r.at)!, campaignId: r.campaign_id ?? undefined }));
}

export async function suppressedSet() {
  const rows = await sql`select email from suppressions`;
  return new Set(rows.map((r) => (r.email as string).toLowerCase()));
}

export async function addSuppression(s: Suppression) {
  await sql`insert into suppressions (email, reason, at, campaign_id) values (${s.email.toLowerCase()}, ${s.reason}, ${s.at}, ${s.campaignId ?? null})
            on conflict (email) do nothing`;
}

export async function removeSuppression(email: string) {
  const [r] = await sql`select reason from suppressions where email = ${email.toLowerCase()}`;
  if (r && r.reason !== "manual") throw new Error(`Can't lift a ${r.reason} suppression from here`);
  await sql`delete from suppressions where email = ${email.toLowerCase()}`;
}

/* ── flows ────────────────────────────────────────────────────────────── */

export async function getFlowState(fid: string): Promise<FlowState> {
  const [r] = await sql`select doc from flows where id = ${fid}`;
  return (r?.doc as FlowState) ?? { autoRun: false, params: {} };
}

export async function saveFlowState(fid: string, s: FlowState) {
  await sql`insert into flows (id, doc) values (${fid}, ${JSON.stringify(s)}::jsonb) on conflict (id) do update set doc = excluded.doc`;
}

export type Enrollment = { userId: string; email: string; firstSeen: string; baseline: boolean; steps: Record<string, string> };

export async function getEnrollments(fid: string): Promise<Map<string, Enrollment>> {
  const rows = await sql`select * from enrollments where flow_id = ${fid}`;
  return new Map(rows.map((r) => [r.user_id as string, { userId: r.user_id, email: r.email, firstSeen: iso(r.first_seen)!, baseline: r.baseline, steps: r.steps }]));
}

export async function addEnrollments(fid: string, rows: { userId: string; email: string; baseline: boolean }[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = JSON.stringify(rows.slice(i, i + 500));
    await sql`insert into enrollments (flow_id, user_id, email, baseline)
              select ${fid}, x->>'userId', x->>'email', (x->>'baseline')::boolean from jsonb_array_elements(${chunk}::jsonb) x
              on conflict do nothing`;
  }
}

export async function markStep(fid: string, userId: string, step: string, at: string) {
  await sql`update enrollments set steps = steps || jsonb_build_object(${step}::text, ${at}::text) where flow_id = ${fid} and user_id = ${userId}`;
}

/* ── quiz ─────────────────────────────────────────────────────────────── */

export async function getAnswer(quizKey: string, idx: number) {
  const [r] = await sql`select choice, correct from quiz_answers where quiz_key = ${quizKey} and idx = ${idx}`;
  return r as { choice: number; correct: boolean } | undefined;
}

export async function answersFor(quizKey: string) {
  const rows = await sql`select idx, choice, correct from quiz_answers where quiz_key = ${quizKey} order by idx`;
  return rows as { idx: number; choice: number; correct: boolean }[];
}

/** True for the one caller that gets to send this set's results; false if someone already did. */
export async function claimQuizResult(r: { quizKey: string; brand: string; email: string; right: number; total: number }) {
  const rows = await sql`insert into quiz_results (quiz_key, brand, email, right_count, total)
                         values (${r.quizKey}, ${r.brand}, ${r.email}, ${r.right}, ${r.total})
                         on conflict (quiz_key) do nothing returning quiz_key`;
  return rows.length > 0;
}

export async function releaseQuizResult(quizKey: string) {
  await sql`delete from quiz_results where quiz_key = ${quizKey}`;
}

export type Lifetime = { correct: number; attempted: number; answered: number; accuracy: number; days: number; streak: number };

/**
 * Everything a person has answered, for the score in the quiz email. Days come
 * from the set's key (brand:date:hash); the streak is consecutive days with an
 * answer, ending today or, before today's set is touched, yesterday.
 */
export async function lifetimeFor(brand: string, email: string): Promise<Lifetime> {
  const rows = (await sql`select split_part(quiz_key, ':', 2) as day,
                                 count(*)::int as answered,
                                 count(*) filter (where correct)::int as correct,
                                 count(*) filter (where choice >= 0)::int as attempted
                            from quiz_answers where brand = ${brand} and email = ${email.toLowerCase()}
                           group by 1 order by 1 desc`) as { day: string; answered: number; correct: number; attempted: number }[];
  const sum = (k: "answered" | "correct" | "attempted") => rows.reduce((n, r) => n + r[k], 0);
  const dayMs = 86_400_000;
  let streak = 0;
  let expect = Date.parse(new Date().toISOString().slice(0, 10));
  if (rows[0] && Date.parse(rows[0].day) < expect) expect -= dayMs;
  for (const r of rows) {
    if (Date.parse(r.day) !== expect) break;
    streak++;
    expect -= dayMs;
  }
  const attempted = sum("attempted");
  const correct = sum("correct");
  return { correct, attempted, answered: sum("answered"), accuracy: attempted ? Math.round((correct / attempted) * 100) : 0, days: rows.length, streak };
}

/**
 * When each address last got each of these templates, from any campaign or
 * automation. Queued counts as now while its campaign is sending, so a send
 * that's waiting isn't repeated; a paused or canceled campaign's queue doesn't.
 */
export async function templateHistory(templateIds: string[]) {
  const out = new Map<string, Map<string, number>>(templateIds.map((t) => [t, new Map()]));
  if (!templateIds.length) return out;
  const rows = (await sql`select c.doc->>'templateId' as t, lower(s.email) as email,
                                 max(case when s.status = 'queued' then now() else s.sent_at end) as at
                            from sends s join campaigns c on c.id = s.campaign_id
                           where c.doc->>'templateId' = any(${templateIds})
                             and (s.status = 'sent' or (s.status = 'queued' and c.status = 'sending'))
                           group by 1, 2`) as { t: string; email: string; at: string | Date }[];
  for (const r of rows) out.get(r.t)!.set(r.email, new Date(r.at).getTime());
  return out;
}

/** Sends today (UTC, the day Resend's quota counts) by an automation's campaigns. */
export async function flowSendsToday(flowId: string, step: string) {
  const [r] = await sql`select count(*)::int as n from sends s join campaigns c on c.id = s.campaign_id
                         where c.doc->'flow'->>'id' = ${flowId} and c.doc->'flow'->>'step' = ${step}
                           and (s.status = 'sent' or (s.status = 'queued' and c.status = 'sending')) and coalesce(s.sent_at, c.created_at) >= date_trunc('day', now() at time zone 'utc')`;
  return r.n as number;
}

/** First answer wins; a second click on another option doesn't change the record. */
export async function recordAnswer(a: { quizKey: string; idx: number; brand: string; email: string; questionId: string; choice: number; correct: boolean }) {
  await sql`insert into quiz_answers (quiz_key, idx, brand, email, question_id, choice, correct)
            values (${a.quizKey}, ${a.idx}, ${a.brand}, ${a.email}, ${a.questionId}, ${a.choice}, ${a.correct})
            on conflict (quiz_key, idx) do nothing`;
}
