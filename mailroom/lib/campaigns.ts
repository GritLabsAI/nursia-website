import {
  addSuppression, getCampaign, getFlowState, getLists, getSettings, insertSends, listCampaigns, markFailed, markSent, queuedSends, saveFlowState,
  saveCampaign, sql, statsFor, suppressedSet, type Campaign, type Contact, type Send, type Settings,
} from "./db";
import { findTemplate, type TemplateDef } from "./templates";
import { render } from "./render";
import { listEmails, listUnsubscribed, sendEmail, type EmailSummary } from "./resend";
import { baseUrl, enqueue } from "./jobs";

/**
 * Sending, and finding out what happened afterwards.
 *
 * A send is one email per request rather than the batch endpoint, because
 * batch doesn't take attachments and the PrepClever logo is one. Recipients
 * are written to `sends` up front; a background job then works through the
 * queued rows in chunks that fit comfortably inside one function run, and
 * queues itself again until none are left. A crash mid-send loses nothing:
 * the next run picks up the queued rows, and Resend's idempotency key stops
 * anyone getting it twice.
 */

const WORKERS = 4;
const CHUNK_MS = 200_000;

/* Unsubscribe and answer links always point at this deployment, wherever it's hosted. */
export function settingsWithSecret(s: Awaited<ReturnType<typeof getSettings>>): Settings {
  return { ...s, siteUrl: baseUrl(), unsubSecret: process.env.EMAIL_UNSUB_SECRET ?? "" };
}

export function listIdsOf(c: Pick<Campaign, "listId" | "listIds">) {
  return c.listIds?.length ? c.listIds : c.listId ? [c.listId] : [];
}

/**
 * Everyone across a campaign's lists, once each. Someone on two lists gets one
 * email; their details are merged, with the first list's non-blank value winning.
 */
export async function audienceOf(c: Pick<Campaign, "listId" | "listIds">) {
  const byEmail = new Map<string, Contact>();
  for (const l of await getLists(listIdsOf(c))) {
    for (const contact of l.contacts) {
      const e = contact.email.toLowerCase();
      const prev = byEmail.get(e);
      if (!prev) byEmail.set(e, { ...contact });
      else for (const [k, v] of Object.entries(contact)) if (v !== "" && (prev[k] ?? "") === "") prev[k] = v;
    }
  }
  return [...byEmail.values()];
}

function listUnsubHeader(url: string, mailbox?: string) {
  return {
    "List-Unsubscribe": mailbox ? `<${url}>, <mailto:${mailbox}?subject=unsubscribe>` : `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

const own = (r: Record<string, string> | undefined) => Object.fromEntries(Object.entries(r ?? {}).filter(([, v]) => v !== ""));

export async function sendTest(c: Campaign, to: string, settings: Settings) {
  const t = await findTemplate(c.templateId);
  if (!t) throw new Error(`Unknown template ${c.templateId}`);
  const [first] = await audienceOf(c);
  /* Same merge order as a real send: fill-ins first, then whatever the contact
     actually has — a blank in their row must not wipe the fill-in. */
  const vars = { ...t.sample, first_name: "Asha", ...c.vars, ...own(first), email: to };
  const r = await render(t, c.subject, vars, settings, { mode: "send", campaignId: c.id });
  return sendEmail({
    from: c.from,
    to: [to],
    reply_to: c.replyTo || undefined,
    subject: `[Test] ${r.subject}`,
    html: r.html,
    attachments: r.attachments.length ? r.attachments : undefined,
    tags: [{ name: "kind", value: "test" }],
  });
}

/** Writes the recipient rows and starts the background send. */
export async function startCampaign(c: Campaign) {
  const t = await findTemplate(c.templateId);
  if (!t) throw new Error("Campaign has no template");
  /* Fresh unsubscribes first: someone who clicked the link an hour ago must
     not get this one. If Resend can't be reached, the send doesn't start. */
  await refreshUnsubscribes();
  const blocked = await suppressedSet();
  const people = await audienceOf(c);
  if (!people.length) throw new Error("Nobody to send to");
  await insertSends(c.id, people.map((p) => ({ email: p.email.toLowerCase(), status: blocked.has(p.email.toLowerCase()) ? "skipped" : "queued", contact: p })));
  c.status = "sending";
  c.error = undefined;
  await saveCampaign(c);
  await kick(c.id);
}

export function kick(cid: string) {
  return enqueue("/api/jobs/send", { campaignId: cid }, async () => {
    while ((await processCampaign(cid)) > 0) { /* keep going locally */ }
  });
}

/**
 * Sends queued rows until the time budget runs out. Returns how many are
 * still queued; the job endpoint re-queues itself when that isn't zero.
 */
export async function processCampaign(cid: string): Promise<number> {
  const c = await getCampaign(cid);
  if (!c || c.status !== "sending") return 0;
  const t = await findTemplate(c.templateId);
  if (!t) return 0;
  const settings = settingsWithSecret(await getSettings());
  const mailbox = settings.brands[c.brand]?.replyTo;
  const started = Date.now();

  while (Date.now() - started < CHUNK_MS) {
    const queue = await queuedSends(cid, 40);
    if (!queue.length) break;
    const work = async () => {
      for (let s = queue.shift(); s; s = queue.shift()) await sendOne(c, t, s, settings, mailbox);
    };
    await Promise.all(Array.from({ length: WORKERS }, work));
  }

  const [{ n }] = await sql`select count(*)::int as n from sends where campaign_id = ${cid} and status = 'queued'`;
  if (n === 0) await finish(c);
  return n as number;
}

async function sendOne(c: Campaign, t: TemplateDef, s: Send, settings: Settings, mailbox?: string) {
  try {
    const vars = { ...c.vars, ...own(s.contact), email: s.email };
    const r = await render(t, c.subject, vars, settings, { mode: "send", campaignId: c.id });
    const res = await sendEmail(
      {
        from: c.from,
        to: [s.email],
        reply_to: c.replyTo || undefined,
        subject: r.subject,
        html: r.html,
        scheduled_at: c.scheduledAt || undefined,
        headers: listUnsubHeader(r.unsubscribeUrl, mailbox),
        attachments: r.attachments.length ? r.attachments : undefined,
        tags: [
          { name: "campaign", value: c.id },
          { name: "template", value: c.templateId },
        ],
      },
      `${c.id}:${s.email.toLowerCase()}`,
    );
    await markSent(c.id, s.email, res.id);
  } catch (err) {
    await markFailed(c.id, s.email, err instanceof Error ? err.message : String(err));
  }
}

async function finish(c: Campaign) {
  const st = (await statsFor([c.id])).get(c.id)!;
  c.status = st.sent === 0 && st.failed > 0 ? "failed" : "sent";
  c.error = st.failed ? `${st.failed} of ${st.recipients} failed; see the People table` : undefined;
  c.sentAt = new Date().toISOString();
  await saveCampaign(c);
  if (c.flow) await finishFlowStep(c.flow.id, c.flow.step, c.id);
}

/**
 * A flow step is "had" only by people Resend accepted; anyone whose send
 * failed stays due and is picked up on a later tick.
 */
async function finishFlowStep(fid: string, step: string, cid: string) {
  await sql`
    update enrollments e set steps = e.steps || jsonb_build_object(${step}::text, to_char(s.sent_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      from sends s
     where s.campaign_id = ${cid} and s.status = 'sent' and e.flow_id = ${fid} and e.user_id = s.contact->>'user_id'`;
  const st = await getFlowState(fid);
  st.running = undefined;
  st.lastRunAt = new Date().toISOString();
  await saveFlowState(fid, st);
}

/* ── results ──────────────────────────────────────────────────────────── */

export async function refreshUnsubscribes() {
  const contacts = await listUnsubscribed();
  const have = await suppressedSet();
  for (const ct of contacts) {
    const e = ct.email.toLowerCase();
    if (have.has(e)) continue;
    /* Credit the most recent campaign that reached them. */
    const [last] = await sql`select campaign_id from sends where email = ${e} and status = 'sent' order by sent_at desc nulls last limit 1`;
    await addSuppression({ email: e, reason: "unsubscribed", at: ct.created_at, campaignId: last?.campaign_id });
    have.add(e);
  }
}

/**
 * Backfill from Resend's email list, for anything the webhook missed (or
 * before the webhook was connected). Webhooks are the main source now; this
 * is the "Refresh results" button.
 */
export async function sync() {
  const pending = await sql`
    select resend_id, sent_at from sends
     where resend_id is not null and sent_at > now() - interval '30 days'
       and (last_event is null or last_event in ('sent','delivered','opened','delivery_delayed','scheduled'))`;
  const want = new Set(pending.map((p) => p.resend_id as string));
  const oldest = Math.min(...pending.map((p) => Date.parse(p.sent_at)), Date.now());
  let after: string | undefined;
  let seen = 0;
  for (let page = 0; want.size && page < 300; page++) {
    const res = await listEmails(after);
    for (const e of res.data) {
      if (!want.has(e.id)) continue;
      await applyPolled(e);
      want.delete(e.id);
      seen++;
    }
    const last = res.data[res.data.length - 1];
    if (!res.has_more || !last) break;
    if (Date.parse(last.created_at.replace(" ", "T").replace(/\+00$/, "Z")) < oldest - 3600_000) break;
    after = last.id;
  }
  await sql`insert into suppressions (email, reason, campaign_id)
            select distinct on (email) email, case when complained_at is not null then 'complained' else 'bounced' end, campaign_id
              from sends where bounced_at is not null or complained_at is not null
            on conflict (email) do nothing`;
  await refreshUnsubscribes();
  await sql`insert into settings (key, value) values ('syncedAt', to_jsonb(now()::text)) on conflict (key) do update set value = excluded.value`;
  return { updated: seen };
}

async function applyPolled(e: EmailSummary) {
  const ev = e.last_event;
  await sql`
    update sends set last_event = ${ev},
      delivered_at = case when ${ev} in ('delivered','opened','clicked','complained') then coalesce(delivered_at, now()) else delivered_at end,
      opened_at    = case when ${ev} in ('opened','clicked') then coalesce(opened_at, now()) else opened_at end,
      clicked_at   = case when ${ev} = 'clicked' then coalesce(clicked_at, now()) else clicked_at end,
      bounced_at   = case when ${ev} = 'bounced' then coalesce(bounced_at, now()) else bounced_at end,
      complained_at = case when ${ev} = 'complained' then coalesce(complained_at, now()) else complained_at end
    where resend_id = ${e.id}`;
}

export async function overview(days = 30) {
  const [totals] = await sql`
    select count(*) filter (where status = 'sent')::int as sent, count(delivered_at)::int as delivered, count(opened_at)::int as opened,
           count(clicked_at)::int as clicked, count(bounced_at)::int as bounced, count(complained_at)::int as complained
      from sends`;
  const [u] = await sql`select count(*)::int as n from suppressions where reason = 'unsubscribed' and campaign_id is not null`;
  const rows = await sql`
    with d as (select generate_series(current_date - ${days - 1}::int, current_date, '1 day')::date as day)
    select to_char(d.day, 'YYYY-MM-DD') as date,
           (select count(*) from sends where status = 'sent' and sent_at::date = d.day)::int as sent,
           (select count(*) from sends where opened_at::date = d.day)::int as opened,
           (select count(*) from sends where clicked_at::date = d.day)::int as clicked
      from d order by d.day`;
  return { totals: { ...totals, unsubscribed: u.n }, series: rows };
}

export async function campaignsWithStats() {
  const cs = await listCampaigns();
  const st = await statsFor(cs.map((c) => c.id));
  return cs.map((c) => ({ c, stats: st.get(c.id)! }));
}
