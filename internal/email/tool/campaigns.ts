import { db, save, type Campaign, type Send, type Settings } from "./store";
import { getTemplate } from "./templates";
import { render } from "./render";
import { listEmails, listUnsubscribed, sendEmail, type EmailSummary } from "./resend";

/**
 * Sending, and finding out what happened afterwards.
 *
 * Sends go one email per request rather than through the batch endpoint,
 * because batch doesn't take attachments and the PrepClever logo is one. At
 * eight a second that's ~29k an hour, which is more than this list will be.
 *
 * "What happened" is read back by polling Resend's email list for each send's
 * last_event, rather than by webhook, because a webhook needs a public URL and
 * this runs on localhost. The trade: opens are stamped when the dashboard
 * syncs, not to the second they happened, and a single email reports only its
 * furthest event, not how many times it was opened.
 */

const WORKERS = 4;

export function suppressedSet() {
  return new Set(db.suppressions.map((s) => s.email.toLowerCase()));
}

function listUnsubHeader(url: string, brand: string) {
  const mailbox = db.settings.brands[brand as "nursia"]?.replyTo;
  return {
    "List-Unsubscribe": mailbox ? `<${url}>, <mailto:${mailbox}?subject=unsubscribe>` : `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** The lists a campaign goes to. Older campaigns only have listId. */
export function listsOf(c: Pick<Campaign, "listId" | "listIds">) {
  const ids = c.listIds?.length ? c.listIds : c.listId ? [c.listId] : [];
  return ids.map((id) => db.lists.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
}

/**
 * Everyone across a campaign's lists, once each. Someone on two lists gets one
 * email; their details are merged, with the first list's non-blank value winning.
 */
export function audienceOf(c: Pick<Campaign, "listId" | "listIds">) {
  const byEmail = new Map<string, Record<string, string> & { email: string }>();
  for (const l of listsOf(c)) {
    for (const contact of l.contacts) {
      const e = contact.email.toLowerCase();
      const prev = byEmail.get(e);
      if (!prev) byEmail.set(e, { ...contact });
      else for (const [k, v] of Object.entries(contact)) if (v !== "" && (prev[k] ?? "") === "") prev[k] = v;
    }
  }
  return [...byEmail.values()];
}

export async function sendTest(c: Campaign, to: string, settings: Settings) {
  const t = getTemplate(c.templateId);
  if (!t) throw new Error(`Unknown template ${c.templateId}`);
  const first = audienceOf(c)[0];
  /* Same merge order as a real send: fallbacks first, then whatever the
     contact actually has — a blank in their row must not wipe the fallback. */
  const own = Object.fromEntries(Object.entries(first ?? {}).filter(([, v]) => v !== ""));
  const vars = { ...t.sample, first_name: "Asha", ...c.vars, ...own, email: to };
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

/** Fills `sends` from the list, then works through every send still queued. */
export async function runCampaign(c: Campaign, settings: Settings) {
  const t = getTemplate(c.templateId);
  const contacts = audienceOf(c);
  if (!t || !contacts.length) throw new Error("Campaign has no template or nobody to send to");

  /* Pull fresh unsubscribes first: someone who clicked the link an hour ago
     must not get this one. A failure here stops the send rather than risking it. */
  await refreshUnsubscribes();
  const blocked = suppressedSet();

  if (!c.sends.length) {
    const seen = new Set<string>();
    for (const contact of contacts) {
      const e = contact.email.toLowerCase();
      if (seen.has(e)) continue;
      seen.add(e);
      c.sends.push({ email: contact.email, status: blocked.has(e) ? "skipped" : "queued" });
    }
  }
  c.status = "sending";
  c.error = undefined;
  save();

  const queue = c.sends.filter((s) => s.status === "queued");
  const byEmail = new Map(contacts.map((x) => [x.email.toLowerCase(), x]));
  let done = 0;

  const work = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      await sendOne(c, s, byEmail.get(s.email.toLowerCase()) ?? { email: s.email }, settings);
      if (++done % 20 === 0) save();
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, work));

  const failed = c.sends.filter((s) => s.status === "failed").length;
  const sent = c.sends.filter((s) => s.status === "sent").length;
  c.status = sent === 0 && failed > 0 ? "failed" : "sent";
  if (failed) c.error = `${failed} of ${c.sends.length} failed — see the recipient table`;
  c.sentAt = new Date().toISOString();
  save();
}

async function sendOne(c: Campaign, s: Send, contact: Record<string, string>, settings: Settings) {
  const t = getTemplate(c.templateId)!;
  try {
    const vars = { ...c.vars, ...Object.fromEntries(Object.entries(contact).filter(([, v]) => v !== "")) };
    const r = await render(t, c.subject, vars, settings, { mode: "send", campaignId: c.id });
    const res = await sendEmail(
      {
        from: c.from,
        to: [s.email],
        reply_to: c.replyTo || undefined,
        subject: r.subject,
        html: r.html,
        scheduled_at: c.scheduledAt || undefined,
        headers: listUnsubHeader(r.unsubscribeUrl, c.brand),
        attachments: r.attachments.length ? r.attachments : undefined,
        tags: [
          { name: "campaign", value: c.id },
          { name: "template", value: c.templateId },
        ],
      },
      /* Resend drops a repeat within 24h, so resuming a crashed send can't
         double-mail anyone it already reached. */
      `${c.id}:${s.email.toLowerCase()}`,
    );
    s.resendId = res.id;
    s.status = "sent";
    s.sentAt = new Date().toISOString();
  } catch (err) {
    s.status = "failed";
    s.error = err instanceof Error ? err.message : String(err);
  }
}

/** Campaigns left "sending" by a closed terminal pick up where they stopped. */
export function resumable() {
  return db.campaigns.filter((c) => c.status === "sending");
}

/* ── Sync ─────────────────────────────────────────────────────────────── */

function apply(s: Send, e: EmailSummary, now: string) {
  s.lastEvent = e.last_event;
  const ev = e.last_event;
  if (["delivered", "opened", "clicked", "complained"].includes(ev)) s.delivered ??= now;
  if (ev === "opened" || ev === "clicked") s.opened ??= now;
  if (ev === "clicked") s.clicked ??= now;
  if (ev === "bounced") s.bounced ??= now;
  if (ev === "complained") s.complained ??= now;
}

export async function refreshUnsubscribes() {
  const contacts = await listUnsubscribed();
  const have = suppressedSet();
  for (const ct of contacts) {
    const e = ct.email.toLowerCase();
    if (have.has(e)) continue;
    /* Credit the most recent campaign that reached them: the token carries the
       campaign id, but Resend's contact record doesn't keep it. */
    const last = db.campaigns
      .filter((c) => c.sends.some((s) => s.email.toLowerCase() === e && s.status === "sent"))
      .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))[0];
    db.suppressions.push({ email: ct.email, reason: "unsubscribed", at: ct.created_at, campaignId: last?.id });
    have.add(e);
  }
}

/**
 * Walks Resend's email list newest-first until every tracked send from the
 * last 30 days has been seen, or the list runs past the oldest of them.
 */
export async function sync() {
  const cutoff = Date.now() - 30 * 86400_000;
  const pending = new Map<string, { s: Send; c: Campaign }>();
  let oldest = Infinity;
  for (const c of db.campaigns) {
    for (const s of c.sends) {
      if (!s.resendId || !s.sentAt) continue;
      const at = Date.parse(s.sentAt);
      if (at < cutoff) continue;
      pending.set(s.resendId, { s, c });
      oldest = Math.min(oldest, at);
    }
  }

  const now = new Date().toISOString();
  let after: string | undefined;
  let seen = 0;
  for (let page = 0; pending.size && page < 300; page++) {
    const res = await listEmails(after);
    for (const e of res.data) {
      const hit = pending.get(e.id);
      if (hit) {
        apply(hit.s, e, now);
        pending.delete(e.id);
        seen++;
      }
    }
    const last = res.data[res.data.length - 1];
    if (!res.has_more || !last) break;
    if (Date.parse(last.created_at.replace(" ", "T").replace(/\+00$/, "Z")) < oldest - 3600_000) break;
    after = last.id;
  }

  const blocked = suppressedSet();
  for (const c of db.campaigns) {
    for (const s of c.sends) {
      const e = s.email.toLowerCase();
      const reason = s.complained ? "complained" : s.bounced ? "bounced" : null;
      if (reason && !blocked.has(e)) {
        db.suppressions.push({ email: s.email, reason, at: now, campaignId: c.id });
        blocked.add(e);
      }
    }
  }

  await refreshUnsubscribes();
  db.syncedAt = now;
  save();
  return { updated: seen };
}

/* ── Stats ────────────────────────────────────────────────────────────── */

export function stats(c: Campaign) {
  const n = (f: (s: Send) => unknown) => c.sends.filter(f).length;
  const sent = n((s) => s.status === "sent");
  const delivered = n((s) => s.delivered);
  const opened = n((s) => s.opened);
  const clicked = n((s) => s.clicked);
  const bounced = n((s) => s.bounced);
  const complained = n((s) => s.complained);
  const unsubscribed = db.suppressions.filter((x) => x.campaignId === c.id && x.reason === "unsubscribed").length;
  const pct = (a: number, b: number) => (b ? a / b : null);
  return {
    recipients: c.sends.length,
    queued: n((s) => s.status === "queued"),
    sent,
    failed: n((s) => s.status === "failed"),
    skipped: n((s) => s.status === "skipped"),
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    unsubscribed,
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, delivered),
    clickRate: pct(clicked, delivered),
    clickToOpen: pct(clicked, opened),
    bounceRate: pct(bounced, sent),
    unsubRate: pct(unsubscribed, delivered),
  };
}

export function overview(days = 30) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400_000).toISOString().slice(0, 10);
    return { date: d, sent: 0, opened: 0, clicked: 0 };
  });
  const idx = (iso?: string) => (iso ? series.findIndex((p) => p.date === iso.slice(0, 10)) : -1);
  const totals = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0 };
  for (const c of db.campaigns) {
    const st = stats(c);
    totals.sent += st.sent;
    totals.delivered += st.delivered;
    totals.opened += st.opened;
    totals.clicked += st.clicked;
    totals.bounced += st.bounced;
    totals.complained += st.complained;
    totals.unsubscribed += st.unsubscribed;
    for (const s of c.sends) {
      let i = idx(s.sentAt);
      if (i >= 0 && s.status === "sent") series[i].sent++;
      if ((i = idx(s.opened)) >= 0) series[i].opened++;
      if ((i = idx(s.clicked)) >= 0) series[i].clicked++;
    }
  }
  return { totals, series };
}
