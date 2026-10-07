import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { db, id, save, type Campaign, type Settings } from "./store";
import { TEMPLATES, fieldsUsed, getTemplate, readTemplate } from "./templates";
import { render } from "./render";
import { isEmail, parseCsv } from "./csv";
import { audienceOf, listsOf, overview, resumable, runCampaign, sendTest, stats, suppressedSet, sync } from "./campaigns";
import { cancelEmail, getDomain, listDomains, setTracking, setTrackingSubdomain, verifyDomain, type Domain } from "./resend";
import { FLOWS, overviewOf, runAllDue, sendStep, sendStepTest, setFlow } from "./flows";
import { PRESETS, configured, describe, posthogCohorts, posthogEvents, runAudience, testConnection, type AudienceDef, type DbKey } from "./audiences";

/**
 * The campaign dashboard: `npm run email` and open http://localhost:4410.
 *
 * Bound to 127.0.0.1 and nothing else. There's no login because the only way
 * in is from this machine; the Resend key never reaches the browser, which only
 * ever talks to this server.
 */

const PORT = Number(process.env.EMAIL_TOOL_PORT) || 4410;
const PUBLIC = join(import.meta.dirname, "public");

const secret = process.env.EMAIL_UNSUB_SECRET;
if (!process.env.RESEND_API_KEY || !secret) {
  console.error("Set RESEND_API_KEY and EMAIL_UNSUB_SECRET in .env.local first (see .env.example).");
  process.exit(1);
}

const settings = (): Settings => ({ ...db.settings, unsubSecret: secret });

/* ── helpers ──────────────────────────────────────────────────────────── */

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function body<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : ({} as T);
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function file(res: ServerResponse, path: string) {
  if (!existsSync(path)) throw new HttpError(404, "Not found");
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
}

function campaignOr404(cid: string) {
  const c = db.campaigns.find((x) => x.id === cid);
  if (!c) throw new HttpError(404, "No such campaign");
  return c;
}

function listOr404(lid: string) {
  const l = db.lists.find((x) => x.id === lid);
  if (!l) throw new HttpError(404, "No such list");
  return l;
}

function summary(c: Campaign) {
  const { sends, ...rest } = c;
  void sends;
  return {
    ...rest,
    template: getTemplate(c.templateId)?.name,
    list: listsOf(c).map((l) => l.name).join(" + ") || undefined,
    recipients: audienceOf(c).length,
    stats: stats(c),
    /* Handed to Resend with a future send time: still cancellable. */
    scheduled: c.status === "sent" && !!c.scheduledAt && Date.parse(c.scheduledAt) > Date.now(),
  };
}

function importContacts(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length && !("email" in rows[0])) throw new HttpError(400, "The CSV needs an \"email\" column");
  const good = rows.filter((r) => isEmail(r.email ?? ""));
  return { contacts: good.map((r) => ({ ...r, email: r.email.toLowerCase() })), rejected: rows.length - good.length };
}

/** Checks that should stop a send, or at least make you look twice. */
async function checks(c: Campaign) {
  const out: { level: "block" | "warn"; text: string }[] = [];
  const lists = listsOf(c);
  const blocked = suppressedSet();
  const everyone = audienceOf(c);
  const reachable = everyone.filter((x) => !blocked.has(x.email.toLowerCase())).length;
  if (!lists.length) out.push({ level: "block", text: "No list chosen." });
  else if (!reachable) out.push({ level: "block", text: "Everyone on the chosen lists has unsubscribed or bounced." });
  const total = lists.reduce((a, l) => a + l.contacts.length, 0);
  if (lists.length > 1 && total > everyone.length)
    out.push({ level: "warn", text: total - everyone.length === 1 ? "1 person is on more than one of these lists; they get it once." : `${total - everyone.length} people are on more than one of these lists; they get it once.` });
  for (const list of lists) if (list.source && Date.now() - Date.parse(list.refreshedAt ?? list.createdAt) > 6 * 3600_000)
    out.push({ level: "warn", text: `"${list.name}" was last pulled from ${list.source.source === "posthog" ? "PostHog" : "Supabase"} ${new Date(list.refreshedAt ?? list.createdAt).toLocaleString()}. Refresh it on the list page so it matches who qualifies today.` });
  out.push(...(await senderChecks(c)));
  return { checks: out, reachable };
}

/** The checks that depend only on who's sending, not on the list. Flow steps use these before a list exists. */
async function senderChecks(c: Pick<Campaign, "brand" | "from">) {
  const out: { level: "block" | "warn"; text: string }[] = [];
  if (!db.settings.brands[c.brand].postalAddress)
    out.push({ level: "warn", text: `No postal address for ${c.brand} (Settings). CAN-SPAM requires one in marketing email; the footer will show a blank.` });
  const host = c.from.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  try {
    const { data } = await listDomains();
    const d = data.find((x) => x.name === host);
    if (!d) out.push({ level: "block", text: `${host} isn't a domain on this Resend account.` });
    else if (!d.open_tracking) out.push({ level: "warn", text: `Open tracking is off for ${d.name}, so this campaign will show 0% opens. Turn it on in Settings first.` });
  } catch (e) {
    out.push({ level: "warn", text: `Couldn't check domains: ${(e as Error).message}` });
  }
  try {
    const r = await fetch(`${db.settings.siteUrl.replace(/\/$/, "")}/api/email/unsubscribe`, { redirect: "manual" });
    if (r.status === 404) out.push({ level: "warn", text: `The unsubscribe page isn't live at ${db.settings.siteUrl} yet. Deploy the site (with RESEND_API_KEY and EMAIL_UNSUB_SECRET set) before mailing a real list.` });
  } catch {
    out.push({ level: "warn", text: `Couldn't reach ${db.settings.siteUrl} to check the unsubscribe page.` });
  }
  return out;
}

/* ── routes ───────────────────────────────────────────────────────────── */

type Handler = (req: IncomingMessage, res: ServerResponse, p: string[], url: URL) => Promise<void> | void;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, "([^/]+)")}$`), h]);

on("GET", "/api/state", (_q, res) =>
  json(res, {
    settings: db.settings,
    syncedAt: db.syncedAt,
    templates: TEMPLATES.map(({ file: _f, ...t }) => t),
    lists: db.lists.filter((l) => !l.hidden).map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: l.createdAt,
      count: l.contacts.length,
      fields: [...new Set(l.contacts.flatMap((c) => Object.keys(c)))],
      source: l.source ? describe(l.source) : null,
      db: l.source?.db ?? null,
      refreshedAt: l.refreshedAt,
    })),
    campaigns: db.campaigns.map(summary).reverse(),
    suppressions: db.suppressions.length,
  }),
);

on("GET", "/api/overview", (_q, res) => json(res, overview()));

/** What stands between each brand and a clean send, for the home page. */
on("GET", "/api/health", async (_q, res) => {
  const out: Record<string, { level: string; text: string }[]> = {};
  for (const k of ["nursia", "prepclever"] as const) {
    const b = db.settings.brands[k];
    out[k] = await senderChecks({ brand: k, from: `${b.fromName} <${b.fromEmail}>` });
  }
  json(res, out);
});

on("GET", "/api/templates/:id/preview", async (_q, res, [tid], url) => {
  const t = getTemplate(tid);
  if (!t) throw new HttpError(404, "No such template");
  const extra = JSON.parse(url.searchParams.get("vars") || "{}");
  const subject = url.searchParams.get("subject") || t.subject;
  const r = await render(t, subject, { first_name: "Asha", email: "asha@example.com", ...t.sample, ...extra }, settings(), { mode: "preview" });
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(r.subject) });
  res.end(r.html);
});

/**
 * For one email and one list: each merge field it uses, and how many people
 * on the list have no value for it. The composer offers a fallback for those.
 */
on("GET", "/api/fields", (_q, res, _p, url) => {
  const t = getTemplate(url.searchParams.get("templateId") ?? "");
  if (!t) throw new HttpError(404, "No such template");
  const ids = (url.searchParams.get("listIds") ?? url.searchParams.get("listId") ?? "").split(",").filter(Boolean);
  const contacts = audienceOf({ listId: ids[0] ?? "", listIds: ids });
  json(res, fieldsUsed(t, url.searchParams.get("subject") ?? t.subject).map((f) => {
    const values = contacts.map((c) => (c[f.name] ?? "").trim()).filter(Boolean);
    return {
      ...f,
      total: contacts.length,
      missing: contacts.length - values.length,
      example: values[0] ?? t.sample[f.name] ?? "",
      suggested: t.sample[f.name] ?? "",
    };
  }));
});

on("GET", "/tpl-asset/:id/(.+)", (_q, res, [tid, rel]) => {
  const t = getTemplate(tid);
  if (!t) throw new HttpError(404, "No such template");
  const { dir } = readTemplate(t);
  const path = resolve(dir, normalize(decodeURIComponent(rel)));
  if (!path.startsWith(resolve(dir))) throw new HttpError(403, "Outside the template folder");
  file(res, path);
});

/* lists */

on("GET", "/api/lists/:id", (_q, res, [lid]) => json(res, listOr404(lid)));

on("POST", "/api/lists", async (req, res) => {
  const b = await body<{ name: string; csv: string }>(req);
  if (!b.name?.trim()) throw new HttpError(400, "Give the list a name");
  const { contacts, rejected } = importContacts(b.csv ?? "");
  const seen = new Set<string>();
  const list = { id: id("list"), name: b.name.trim(), createdAt: new Date().toISOString(), contacts: contacts.filter((c) => !seen.has(c.email) && seen.add(c.email)) };
  db.lists.push(list);
  save();
  json(res, { id: list.id, added: list.contacts.length, rejected });
});

on("POST", "/api/lists/:id/contacts", async (req, res, [lid]) => {
  const list = listOr404(lid);
  const { contacts, rejected } = importContacts((await body<{ csv: string }>(req)).csv ?? "");
  const byEmail = new Map(list.contacts.map((c) => [c.email, c]));
  let added = 0;
  for (const c of contacts) {
    const prev = byEmail.get(c.email);
    if (prev) Object.assign(prev, c);
    else (list.contacts.push(c), byEmail.set(c.email, c), added++);
  }
  save();
  json(res, { added, updated: contacts.length - added, rejected });
});

on("DELETE", "/api/lists/:id/contacts/:email", (_q, res, [lid, email]) => {
  const list = listOr404(lid);
  list.contacts = list.contacts.filter((c) => c.email !== decodeURIComponent(email));
  save();
  json(res, { ok: true });
});

on("DELETE", "/api/lists/:id", (_q, res, [lid]) => {
  if (db.campaigns.some((c) => (c.listId === lid || c.listIds?.includes(lid)) && c.status !== "draft"))
    throw new HttpError(409, "A sent campaign uses this list; its numbers need it");
  db.lists = db.lists.filter((l) => l.id !== lid);
  save();
  json(res, { ok: true });
});

/* audiences — lists built from Supabase / PostHog */

on("GET", "/api/audiences/meta", (_q, res) =>
  json(res, {
    configured: configured(),
    presets: PRESETS.map(({ match: _m, ...p }) => p),
  }),
);

on("GET", "/api/audiences/test/:db", async (_q, res, [dbKey]) => json(res, await testConnection(dbKey as DbKey)));
on("GET", "/api/audiences/posthog/events", async (_q, res) => json(res, await posthogEvents()));
on("GET", "/api/audiences/posthog/cohorts", async (_q, res) => json(res, await posthogCohorts()));

on("POST", "/api/audiences/preview", async (req, res) => {
  const { def } = await body<{ def: AudienceDef }>(req);
  const r = await runAudience(def);
  const blocked = suppressedSet();
  json(res, {
    count: r.contacts.length,
    suppressed: r.contacts.filter((c) => blocked.has(c.email)).length,
    matched: r.matched,
    dropped: r.dropped,
    fields: [...new Set(r.contacts.flatMap((c) => Object.keys(c)))],
    sample: r.contacts.slice(0, 25),
    describe: describe(def),
  });
});

on("POST", "/api/audiences/save", async (req, res) => {
  const b = await body<{ def: AudienceDef; name: string }>(req);
  if (!b.name?.trim()) throw new HttpError(400, "Give the list a name");
  const r = await runAudience(b.def);
  const now = new Date().toISOString();
  const list = { id: id("list"), name: b.name.trim(), createdAt: now, contacts: r.contacts, source: b.def, refreshedAt: now };
  db.lists.push(list);
  save();
  json(res, { id: list.id, added: list.contacts.length });
});

/** Re-runs a built list's query and replaces its contacts with today's answer. */
on("POST", "/api/lists/:id/refresh", async (_q, res, [lid]) => {
  const list = listOr404(lid);
  if (!list.source) throw new HttpError(400, "This list was imported from CSV; there's nothing to re-run");
  const before = new Set(list.contacts.map((c) => c.email));
  const r = await runAudience(list.source);
  list.contacts = r.contacts;
  list.refreshedAt = new Date().toISOString();
  save();
  json(res, {
    count: r.contacts.length,
    joined: r.contacts.filter((c) => !before.has(c.email)).length,
    left: [...before].filter((e) => !r.contacts.some((c) => c.email === e)).length,
  });
});

/* flows — the onboarding sequence, step by step */

function flowOr404(fid: string) {
  const f = FLOWS.find((x) => x.id === fid);
  if (!f) throw new HttpError(404, "No such flow");
  return f;
}

on("GET", "/api/flows", (_q, res) => json(res, FLOWS.map((f) => ({ id: f.id, name: f.name, description: f.description }))));

on("GET", "/api/flows/:id", async (_q, res, [fid]) => json(res, await overviewOf(flowOr404(fid))));

on("PUT", "/api/flows/:id", async (req, res, [fid]) => {
  flowOr404(fid);
  setFlow(fid, await body(req));
  json(res, { ok: true });
});

on("GET", "/api/flows/:id/checks", async (_q, res, [fid]) => {
  flowOr404(fid);
  const b = db.settings.brands.nursia;
  json(res, { checks: await senderChecks({ brand: "nursia", from: `${b.fromName} <${b.fromEmail}>` }) });
});

on("POST", "/api/flows/:id/steps/:step/test", async (req, res, [fid, step]) => {
  const { to } = await body<{ to: string }>(req);
  const addrs = String(to ?? "").split(/[,\s]+/).filter(Boolean);
  if (!addrs.length || !addrs.every(isEmail)) throw new HttpError(400, "Enter one or more valid addresses");
  for (const a of addrs) await sendStepTest(flowOr404(fid), step, a, settings());
  json(res, { sent: addrs.length });
});

on("POST", "/api/flows/:id/steps/:step/send", async (req, res, [fid, step]) => {
  const { confirm } = await body<{ confirm: number }>(req);
  try {
    json(res, await sendStep(flowOr404(fid), step, Number(confirm), settings(), checks));
  } catch (e) {
    throw e instanceof HttpError ? e : new HttpError(409, (e as Error).message);
  }
});

on("POST", "/api/flows/:id/run", async (_q, res, [fid]) => {
  const f = flowOr404(fid);
  const st = db.flows[fid];
  if (st?.running) throw new HttpError(409, "A step is already sending");
  /* Answer straight away; steps run one after another in the background. */
  runAllDue(f, settings(), checks)
    .then((r) => { db.flows[fid].lastAutoResult = `Manual run: ${r}`; save(); })
    .catch((e) => console.error("flow run:", e));
  json(res, { ok: true });
});

/* campaigns */

type CampaignInput = Pick<Campaign, "name" | "templateId" | "subject" | "from" | "replyTo" | "listId" | "listIds" | "vars" | "scheduledAt">;

function applyInput(c: Partial<Campaign>, b: CampaignInput) {
  const t = getTemplate(b.templateId);
  if (!t) throw new HttpError(400, "Pick a template");
  Object.assign(c, {
    name: b.name?.trim() || t.name,
    templateId: t.id,
    brand: t.brand,
    subject: b.subject?.trim() || t.subject,
    from: b.from?.trim(),
    replyTo: b.replyTo?.trim() || undefined,
    listIds: (b.listIds?.length ? b.listIds : b.listId ? [b.listId] : []).filter((x) => db.lists.some((l) => l.id === x)),
    listId: b.listIds?.[0] ?? b.listId,
    vars: b.vars ?? {},
    scheduledAt: b.scheduledAt || undefined,
  });
  if (!c.from) throw new HttpError(400, "Set a From address");
}

on("POST", "/api/campaigns", async (req, res) => {
  const c = { id: id("cmp"), status: "draft", createdAt: new Date().toISOString(), sends: [] } as unknown as Campaign;
  applyInput(c, await body<CampaignInput>(req));
  db.campaigns.push(c);
  save();
  json(res, { id: c.id });
});

on("PUT", "/api/campaigns/:id", async (req, res, [cid]) => {
  const c = campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, "Only drafts can be edited");
  applyInput(c, await body<CampaignInput>(req));
  save();
  json(res, { ok: true });
});

on("DELETE", "/api/campaigns/:id", (_q, res, [cid]) => {
  const c = campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, "Sent campaigns are kept for their numbers");
  db.campaigns = db.campaigns.filter((x) => x.id !== cid);
  save();
  json(res, { ok: true });
});

on("GET", "/api/campaigns/:id", (_q, res, [cid]) => {
  const c = campaignOr404(cid);
  json(res, { ...summary(c), sends: c.sends });
});

/** Cancels every email of a scheduled campaign at Resend. Anything already gone stays gone. */
on("POST", "/api/campaigns/:id/cancel", async (_q, res, [cid]) => {
  const c = campaignOr404(cid);
  if (!c.scheduledAt || Date.parse(c.scheduledAt) <= Date.now()) throw new HttpError(409, "Only a send scheduled for the future can be cancelled");
  let canceled = 0;
  const failed: string[] = [];
  for (const s of c.sends) {
    if (s.status !== "sent" || !s.resendId) continue;
    try {
      await cancelEmail(s.resendId);
      s.status = "canceled";
      canceled++;
    } catch (e) {
      failed.push(`${s.email}: ${(e as Error).message}`);
    }
  }
  c.status = failed.length && !canceled ? c.status : "canceled";
  save();
  if (failed.length) throw new HttpError(502, `Cancelled ${canceled}; ${failed.length} couldn't be: ${failed.slice(0, 3).join("; ")}`);
  json(res, { canceled });
});

on("GET", "/api/campaigns/:id/checks", async (_q, res, [cid]) => json(res, await checks(campaignOr404(cid))));

on("GET", "/api/campaigns/:id/preview", async (_q, res, [cid]) => {
  const c = campaignOr404(cid);
  const t = getTemplate(c.templateId)!;
  /* Blanks in the row fall back to the campaign's fill-ins, as they will when sent. */
  const own = Object.fromEntries(Object.entries(audienceOf(c)[0] ?? {}).filter(([, v]) => v !== ""));
  const r = await render(t, c.subject, { first_name: "Asha", email: "asha@example.com", ...t.sample, ...c.vars, ...own }, settings(), { mode: "preview", campaignId: c.id });
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(r.subject) });
  res.end(r.html);
});

on("POST", "/api/campaigns/:id/test", async (req, res, [cid]) => {
  const { to } = await body<{ to: string }>(req);
  const addrs = String(to ?? "").split(/[,\s]+/).filter(Boolean);
  if (!addrs.length || !addrs.every(isEmail)) throw new HttpError(400, "Enter one or more valid addresses");
  const c = campaignOr404(cid);
  const ids = [];
  for (const a of addrs) ids.push((await sendTest(c, a, settings())).id);
  json(res, { sent: ids.length });
});

on("POST", "/api/campaigns/:id/send", async (req, res, [cid]) => {
  const c = campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, `Campaign is already ${c.status}`);
  const { confirm } = await body<{ confirm: number }>(req);
  const { checks: found, reachable } = await checks(c);
  if (found.some((x) => x.level === "block")) throw new HttpError(400, found.filter((x) => x.level === "block").map((x) => x.text).join(" "));
  /* The browser echoes back the count it showed in the confirm dialog, so a
     list that grew in the meantime can't be sent under an old "yes". */
  if (confirm !== reachable) throw new HttpError(409, `The list now has ${reachable} sendable contacts; confirm again`);
  c.status = "sending";
  save();
  runCampaign(c, settings()).catch((e) => {
    c.status = "failed";
    c.error = (e as Error).message;
    save();
  });
  json(res, { ok: true });
});

/* tracking */

on("POST", "/api/sync", async (_q, res) => json(res, await sync()));

/** A domain plus where its tracking setup stands, which the list endpoint doesn't say. */
async function domainView(d: Domain) {
  const full = await getDomain(d.id);
  const records = full.records ?? [];
  const sub = full.tracking_subdomain ?? null;
  const tracking = records.filter((r) => /track/i.test(r.record) || (!!sub && r.name.split(".")[0] === sub));
  return {
    ...d,
    trackingSubdomain: sub,
    trackingRecords: tracking,
    /* Resend won't apply open/click tracking until this is true. */
    trackingReady: tracking.length > 0 && tracking.every((r) => r.status === "verified"),
  };
}

on("GET", "/api/domains", async (_q, res) => {
  const { data } = await listDomains();
  json(res, await Promise.all(data.map(domainView)));
});

on("POST", "/api/domains/:id/tracking", async (req, res, [did]) => {
  const b = await body<{ open: boolean; click: boolean }>(req);
  await setTracking(did, !!b.open, !!b.click);
  /* Resend answers 200 even when it ignores this, so check it actually took. */
  const after = await getDomain(did);
  if (after.open_tracking !== !!b.open || after.click_tracking !== !!b.click)
    throw new HttpError(409, `Resend didn't apply it — ${after.name} needs a verified tracking subdomain first (set it up on this card).`);
  json(res, { ok: true });
});

on("POST", "/api/domains/:id/tracking-subdomain", async (req, res, [did]) => {
  const { subdomain } = await body<{ subdomain: string }>(req);
  const s = String(subdomain ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(s)) throw new HttpError(400, "Use a single label like \"links\" — letters, numbers and dashes");
  await setTrackingSubdomain(did, s);
  const { data } = await listDomains();
  json(res, await domainView(data.find((x) => x.id === did)!));
});

on("POST", "/api/domains/:id/verify", async (_q, res, [did]) => {
  await verifyDomain(did);
  /* Verification runs asynchronously at Resend; give it a moment, then report. */
  await new Promise((r) => setTimeout(r, 3000));
  const { data } = await listDomains();
  json(res, await domainView(data.find((x) => x.id === did)!));
});

/* settings & suppressions */

on("PUT", "/api/settings", async (req, res) => {
  const b = await body<Settings>(req);
  if (b.siteUrl) db.settings.siteUrl = b.siteUrl.trim();
  for (const k of ["nursia", "prepclever"] as const) if (b.brands?.[k]) db.settings.brands[k] = { ...db.settings.brands[k], ...b.brands[k] };
  save();
  json(res, { ok: true });
});

on("GET", "/api/suppressions", (_q, res) => json(res, [...db.suppressions].reverse()));

on("POST", "/api/suppressions", async (req, res) => {
  const { email } = await body<{ email: string }>(req);
  if (!isEmail(email ?? "")) throw new HttpError(400, "Not an email address");
  if (!suppressedSet().has(email.toLowerCase())) db.suppressions.push({ email: email.toLowerCase(), reason: "manual", at: new Date().toISOString() });
  save();
  json(res, { ok: true });
});

on("DELETE", "/api/suppressions/:email", (_q, res, [email]) => {
  const e = decodeURIComponent(email).toLowerCase();
  const s = db.suppressions.find((x) => x.email.toLowerCase() === e);
  /* Only hand-added ones. An unsubscribe lives in Resend and would come back on
     the next sync; a bounce or complaint shouldn't be undone from a button. */
  if (s && s.reason !== "manual") throw new HttpError(409, `Can't lift a ${s.reason} suppression from here`);
  db.suppressions = db.suppressions.filter((x) => x.email.toLowerCase() !== e);
  save();
  json(res, { ok: true });
});

/* ── server ───────────────────────────────────────────────────────────── */

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    for (const [method, re, h] of routes) {
      const m = req.method === method && url.pathname.match(re);
      if (m) return await h(req, res, m.slice(1), url);
    }
    if (req.method !== "GET") throw new HttpError(404, "Not found");
    const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const path = resolve(PUBLIC, normalize(rel));
    if (!path.startsWith(resolve(PUBLIC))) throw new HttpError(403, "Forbidden");
    file(res, path);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : (e as { status?: number }).status || 500;
    if (status >= 500) console.error(e);
    if (!res.headersSent) json(res, { error: (e as Error).message }, status >= 400 && status < 600 ? status : 500);
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Email dashboard → http://localhost:${PORT}`);
  for (const c of resumable()) {
    console.log(`Resuming "${c.name}"`);
    runCampaign(c, settings()).catch((e) => console.error(e));
  }
});

/* Keep the numbers fresh while it's running, so opening the dashboard after
   lunch shows the morning's opens without pressing anything. */
/* Flows with auto-run on are re-checked hourly, as the onboarding README asks:
   who is past 24h with no question answered, who has gone quiet. Only while
   this server is running — close the terminal and the flow pauses. */
setInterval(async () => {
  for (const f of FLOWS) {
    const st = db.flows[f.id];
    if (!st?.autoRun || st.running) continue;
    try {
      st.lastAutoResult = `Auto-run ${new Date().toLocaleString()}: ${await runAllDue(f, settings(), checks)}`;
    } catch (e) {
      st.lastAutoResult = `Auto-run failed: ${(e as Error).message}`;
    }
    save();
  }
}, 60 * 60_000);

setInterval(() => {
  const recent = db.campaigns.some((c) => c.sentAt && Date.now() - Date.parse(c.sentAt) < 7 * 86400_000);
  if (recent) sync().catch((e) => console.error("sync:", e.message));
}, 5 * 60_000);
