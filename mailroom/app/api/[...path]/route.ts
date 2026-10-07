import { type NextRequest } from "next/server";
import { Liquid } from "liquidjs";
import {
  addSuppression, deleteCampaign, deleteCustomTemplate, deleteList, fromLineOf, getCampaign, getCustomTemplate, getList, getMailboxes, getSends,
  getSetting, getSettings, id, listLists, listSuppressions, removeSuppression, saveCampaign, saveCustomTemplate, saveList, saveMailboxes,
  setSetting, sql, statsFor, suppressedSet,
  type Asset, type Brand, type Campaign, type Contact, type CustomTemplate, type Mailbox, type StoredSettings,
} from "@/lib/db";
import { allTemplates, fieldsUsed, findTemplate, fromCustom, readTemplate, type TemplateDef } from "@/lib/templates";
import { hasUnsubscribe, render } from "@/lib/render";
import { isEmail, parseCsv } from "@/lib/csv";
import { audienceOf, campaignsWithStats, listIdsOf, overview, sendTest, settingsWithSecret, startCampaign, sync } from "@/lib/campaigns";
import { campaignChecks, senderChecks } from "@/lib/checks";
import { FLOWS, getFlow, overviewOf, runNextDue, sendStep, sendStepTest, setFlow } from "@/lib/flows";
import { PRESETS, configured, describe, posthogCohorts, posthogEvents, runAudience, testConnection, type AudienceDef, type DbKey } from "@/lib/audiences";
import {
  cancelEmail, createWebhook, sendEmail, deleteWebhook, getDomain, listDomains, listWebhooks, setTracking, setTrackingSubdomain, verifyDomain, type Domain,
} from "@/lib/resend";
import { SESSION_COOKIE, readSession } from "@/lib/session";
import { listUsers, userDetail } from "@/lib/users";
import { baseUrl, hosted, qstash } from "@/lib/jobs";

/**
 * The dashboard's API: everything public/app.js calls. One handler with a
 * small router, so the routes read as one list, the way the local tool's did.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200) => Response.json(data, { status });
const body = async <T = Record<string, unknown>>(req: Request): Promise<T> => {
  const raw = await req.text();
  return raw ? JSON.parse(raw) : ({} as T);
};

type Handler = (req: NextRequest, p: string[], url: URL) => Promise<Response> | Response;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) => routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, "([^/]+)")}$`), h]);

async function templateOr404(tid: string) {
  const t = await findTemplate(tid);
  if (!t) throw new HttpError(404, "No such template");
  return t;
}

/** What the dashboard needs to show a template; the HTML and images stay on the server. */
const templateMeta = ({ file: _f, custom, ...t }: TemplateDef) => ({
  ...t,
  custom: custom ? { footer: custom.footer, archived: custom.archived, updatedAt: custom.updatedAt, createdBy: custom.createdBy, images: Object.keys(custom.assets) } : undefined,
});

async function campaignOr404(cid: string) {
  const c = await getCampaign(cid);
  if (!c) throw new HttpError(404, "No such campaign");
  return c;
}

async function listOr404(lid: string) {
  const l = await getList(lid);
  if (!l) throw new HttpError(404, "No such list");
  return l;
}

function flowOr404(fid: string) {
  const f = getFlow(fid);
  if (!f) throw new HttpError(404, "No such flow");
  return f;
}

const settings = async () => settingsWithSecret(await getSettings());

async function summarize(rows: { c: Campaign; stats: Awaited<ReturnType<typeof statsFor>> extends Map<string, infer S> ? S : never }[]) {
  const [lists, templates] = await Promise.all([
    listLists(true).then((ls) => new Map(ls.map((l) => [l.id, l]))),
    allTemplates(true).then((ts) => new Map(ts.map((t) => [t.id, t]))),
  ]);
  return rows.map(({ c, stats }) => ({
    ...c,
    template: templates.get(c.templateId)?.name,
    list: listIdsOf(c).map((x) => lists.get(x)?.name).filter(Boolean).join(" + ") || undefined,
    recipients: listIdsOf(c).reduce((a, x) => a + (lists.get(x)?.count ?? 0), 0),
    stats,
    /* Handed to Resend with a future send time: still cancellable. */
    scheduled: c.status === "sent" && !!c.scheduledAt && Date.parse(c.scheduledAt) > Date.now(),
  }));
}

function importContacts(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length && !("email" in rows[0])) throw new HttpError(400, 'The CSV needs an "email" column');
  const good = rows.filter((r) => isEmail(r.email ?? ""));
  return { contacts: good.map((r) => ({ ...r, email: r.email.toLowerCase() })) as Contact[], rejected: rows.length - good.length };
}

/* ── state ────────────────────────────────────────────────────────────── */

on("GET", "/api/me", async (req) => {
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  return json({ email: s?.email ?? null });
});

on("GET", "/api/state", async () => {
  const [s, lists, rows, sup, syncedAt, templates, mailboxes] = await Promise.all([
    getSettings(), listLists(), campaignsWithStats(), sql`select count(*)::int as n from suppressions`, getSetting<string>("syncedAt"), allTemplates(), getMailboxes(),
  ]);
  return json({
    settings: s,
    syncedAt: syncedAt ?? null,
    templates: templates.map(templateMeta),
    mailboxes,
    lists: lists.map((l) => ({ ...l, source: l.source ? describe(l.source) : null, db: l.source?.db ?? null })),
    campaigns: await summarize(rows),
    suppressions: sup[0].n,
  });
});

on("GET", "/api/overview", async () => json(await overview()));

on("GET", "/api/health", async () => {
  const s = await getSettings();
  const out: Record<string, unknown[]> = {};
  for (const k of ["nursia", "prepclever"] as const) out[k] = await senderChecks({ brand: k, from: `${s.brands[k].fromName} <${s.brands[k].fromEmail}>` });
  if (!(await getSetting<string>("resendWebhookSecret"))) (out.nursia as unknown[]).push({ level: "warn", text: "Live results aren't connected, so opens and clicks only update when you press Refresh. Connect them in Settings." });
  return json(out);
});

/* ── users: who they are, what they do, what we've sent ───────────────── */

const brandOf = (b: string | null): DbKey => {
  if (b !== "nursia" && b !== "prepclever") throw new HttpError(400, "Pick a brand");
  return b;
};

on("GET", "/api/users", async (_q, _p, url) => json(await listUsers(brandOf(url.searchParams.get("brand")), url.searchParams.has("fresh"))));

on("GET", "/api/users/:brand/:id", async (_q, [brand, uid]) => {
  try {
    return json(await userDetail(brandOf(brand), decodeURIComponent(uid)));
  } catch (e) {
    throw (e as Error).message === "No such user" ? new HttpError(404, "No such user") : e;
  }
});

/* ── templates ────────────────────────────────────────────────────────── */

on("GET", "/api/templates/:id/preview", async (_q, [tid], url) => {
  const t = await templateOr404(tid);
  const extra = JSON.parse(url.searchParams.get("vars") || "{}");
  const subject = url.searchParams.get("subject") || t.subject;
  const r = await render(t, subject, { first_name: "Asha", email: "asha@example.com", ...t.sample, ...extra }, await settings(), { mode: "preview" });
  return new Response(r.html, { headers: { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(r.subject) } });
});

/** Each merge field an email uses, and how many people on the lists lack it. */
on("GET", "/api/fields", async (_q, _p, url) => {
  const t = await templateOr404(url.searchParams.get("templateId") ?? "");
  const ids = (url.searchParams.get("listIds") ?? url.searchParams.get("listId") ?? "").split(",").filter(Boolean);
  const contacts = await audienceOf({ listId: ids[0] ?? "", listIds: ids });
  return json(fieldsUsed(t, url.searchParams.get("subject") ?? t.subject).map((f) => {
    const values = contacts.map((c) => (c[f.name] ?? "").trim()).filter(Boolean);
    return { ...f, total: contacts.length, missing: contacts.length - values.length, example: values[0] ?? t.sample[f.name] ?? "", suggested: t.sample[f.name] ?? "" };
  }));
});

/* ── lists ────────────────────────────────────────────────────────────── */

on("GET", "/api/lists/:id", async (_q, [lid]) => json(await listOr404(lid)));

on("POST", "/api/lists", async (req) => {
  const b = await body<{ name: string; csv: string }>(req);
  if (!b.name?.trim()) throw new HttpError(400, "Give the list a name");
  const { contacts, rejected } = importContacts(b.csv ?? "");
  const seen = new Set<string>();
  const list = { id: id("list"), name: b.name.trim(), createdAt: new Date().toISOString(), contacts: contacts.filter((c) => !seen.has(c.email) && !!seen.add(c.email)) };
  await saveList(list);
  return json({ id: list.id, added: list.contacts.length, rejected });
});

on("POST", "/api/lists/:id/contacts", async (req, [lid]) => {
  const list = await listOr404(lid);
  const { contacts, rejected } = importContacts((await body<{ csv: string }>(req)).csv ?? "");
  const byEmail = new Map(list.contacts.map((c) => [c.email, c]));
  let added = 0;
  for (const c of contacts) {
    const prev = byEmail.get(c.email);
    if (prev) Object.assign(prev, c);
    else (list.contacts.push(c), byEmail.set(c.email, c), added++);
  }
  await saveList(list);
  return json({ added, updated: contacts.length - added, rejected });
});

on("DELETE", "/api/lists/:id/contacts/:email", async (_q, [lid, email]) => {
  const list = await listOr404(lid);
  list.contacts = list.contacts.filter((c) => c.email !== decodeURIComponent(email));
  await saveList(list);
  return json({ ok: true });
});

on("DELETE", "/api/lists/:id", async (_q, [lid]) => {
  const [used] = await sql`select 1 from campaigns where status <> 'draft' and (doc->>'listId' = ${lid} or doc->'listIds' ? ${lid}) limit 1`;
  if (used) throw new HttpError(409, "A sent email uses this list; its results need it");
  await deleteList(lid);
  return json({ ok: true });
});

/* ── audiences ────────────────────────────────────────────────────────── */

on("GET", "/api/audiences/meta", () => json({ configured: configured(), presets: PRESETS.map(({ match: _m, ...p }) => p) }));
on("GET", "/api/audiences/test/:db", async (_q, [dbKey]) => json(await testConnection(dbKey as DbKey)));
on("GET", "/api/audiences/posthog/events", async () => json(await posthogEvents()));
on("GET", "/api/audiences/posthog/cohorts", async () => json(await posthogCohorts()));

on("POST", "/api/audiences/preview", async (req) => {
  const { def } = await body<{ def: AudienceDef }>(req);
  const r = await runAudience(def);
  const blocked = await suppressedSet();
  return json({
    count: r.contacts.length,
    suppressed: r.contacts.filter((c) => blocked.has(c.email)).length,
    matched: r.matched,
    dropped: r.dropped,
    fields: [...new Set(r.contacts.flatMap((c) => Object.keys(c)))],
    sample: r.contacts.slice(0, 25),
    describe: describe(def),
  });
});

on("POST", "/api/audiences/save", async (req) => {
  const b = await body<{ def: AudienceDef; name: string }>(req);
  if (!b.name?.trim()) throw new HttpError(400, "Give the list a name");
  const r = await runAudience(b.def);
  const now = new Date().toISOString();
  const list = { id: id("list"), name: b.name.trim(), createdAt: now, contacts: r.contacts, source: b.def, refreshedAt: now };
  await saveList(list);
  return json({ id: list.id, added: list.contacts.length });
});

on("POST", "/api/lists/:id/refresh", async (_q, [lid]) => {
  const list = await listOr404(lid);
  if (!list.source) throw new HttpError(400, "This list was uploaded; there's nothing to re-run");
  const before = new Set(list.contacts.map((c) => c.email));
  const r = await runAudience(list.source);
  const after = new Set(r.contacts.map((c) => c.email));
  list.contacts = r.contacts;
  list.refreshedAt = new Date().toISOString();
  await saveList(list);
  return json({ count: r.contacts.length, joined: r.contacts.filter((c) => !before.has(c.email)).length, left: [...before].filter((e) => !after.has(e)).length });
});

/* ── flows ────────────────────────────────────────────────────────────── */

on("GET", "/api/flows", () => json(FLOWS.map((f) => ({ id: f.id, name: f.name, brand: f.db, description: f.description }))));
on("GET", "/api/flows/:id", async (_q, [fid]) => json(await overviewOf(flowOr404(fid))));

on("PUT", "/api/flows/:id", async (req, [fid]) => {
  flowOr404(fid);
  await setFlow(fid, await body(req));
  return json({ ok: true });
});

on("GET", "/api/flows/:id/checks", async (_q, [fid]) => {
  const f = flowOr404(fid);
  const s = await getSettings();
  const b = s.brands[f.db];
  return json({ checks: await senderChecks({ brand: f.db, from: `${b.fromName} <${b.fromEmail}>` }) });
});

on("POST", "/api/flows/:id/steps/:step/test", async (req, [fid, step]) => {
  const { to } = await body<{ to: string }>(req);
  const addrs = String(to ?? "").split(/[,\s]+/).filter(Boolean);
  if (!addrs.length || !addrs.every(isEmail)) throw new HttpError(400, "Enter one or more valid addresses");
  for (const a of addrs) await sendStepTest(flowOr404(fid), step, a);
  return json({ sent: addrs.length });
});

on("POST", "/api/flows/:id/steps/:step/send", async (req, [fid, step]) => {
  const { confirm } = await body<{ confirm: number }>(req);
  try {
    return json(await sendStep(flowOr404(fid), step, Number(confirm)));
  } catch (e) {
    throw e instanceof HttpError ? e : new HttpError(409, (e as Error).message);
  }
});

on("POST", "/api/flows/:id/run", async (_q, [fid]) => {
  try {
    return json({ result: await runNextDue(flowOr404(fid)) });
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
});

/* ── campaigns ────────────────────────────────────────────────────────── */

type CampaignInput = Pick<Campaign, "name" | "templateId" | "subject" | "from" | "replyTo" | "listId" | "listIds" | "vars" | "scheduledAt">;

async function applyInput(c: Partial<Campaign>, b: CampaignInput) {
  const t = await findTemplate(b.templateId ?? "");
  if (!t) throw new HttpError(400, "Pick a template");
  if (t.custom?.archived && c.templateId !== t.id) throw new HttpError(400, "That template is archived; restore it on the Templates page first");
  const known = new Set((await listLists(true)).map((l) => l.id));
  const listIds = (b.listIds?.length ? b.listIds : b.listId ? [b.listId] : []).filter((x) => known.has(x));
  Object.assign(c, {
    name: b.name?.trim() || t.name,
    templateId: t.id,
    brand: t.brand,
    subject: b.subject?.trim() || t.subject,
    from: b.from?.trim(),
    replyTo: b.replyTo?.trim() || undefined,
    listIds,
    listId: listIds[0] ?? "",
    vars: b.vars ?? {},
    scheduledAt: b.scheduledAt || undefined,
  });
  if (!c.from) throw new HttpError(400, "Set a From address");
  const addr = c.from.match(/<([^>]+)>/)?.[1] ?? c.from;
  if (!(await getMailboxes()).some((m) => m.brand === t.brand && m.email.toLowerCase() === addr.trim().toLowerCase()))
    throw new HttpError(400, `${addr} isn't a ${t.brand === "nursia" ? "Nursia" : "PrepClever"} mailbox. Add it under Settings → Mailboxes first.`);
}

on("POST", "/api/campaigns", async (req) => {
  const c = { id: id("cmp"), status: "draft", createdAt: new Date().toISOString() } as Campaign;
  await applyInput(c, await body<CampaignInput>(req));
  await saveCampaign(c);
  return json({ id: c.id });
});

on("PUT", "/api/campaigns/:id", async (req, [cid]) => {
  const c = await campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, "Only drafts can be edited");
  await applyInput(c, await body<CampaignInput>(req));
  await saveCampaign(c);
  return json({ ok: true });
});

on("DELETE", "/api/campaigns/:id", async (_q, [cid]) => {
  const c = await campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, "Sent emails are kept for their results");
  await deleteCampaign(cid);
  return json({ ok: true });
});

on("GET", "/api/campaigns/:id", async (_q, [cid]) => {
  const c = await campaignOr404(cid);
  const [summary] = await summarize([{ c, stats: (await statsFor([cid])).get(cid)! }]);
  return json({ ...summary, sends: await getSends(cid) });
});

on("POST", "/api/campaigns/:id/cancel", async (_q, [cid]) => {
  const c = await campaignOr404(cid);
  if (!c.scheduledAt || Date.parse(c.scheduledAt) <= Date.now()) throw new HttpError(409, "Only a send scheduled for the future can be cancelled");
  let canceled = 0;
  const failed: string[] = [];
  for (const s of await getSends(cid)) {
    if (s.status !== "sent" || !s.resendId) continue;
    try {
      await cancelEmail(s.resendId);
      await sql`update sends set status = 'canceled' where campaign_id = ${cid} and email = ${s.email}`;
      canceled++;
    } catch (e) {
      failed.push(`${s.email}: ${(e as Error).message}`);
    }
  }
  if (canceled || !failed.length) {
    c.status = "canceled";
    await saveCampaign(c);
  }
  if (failed.length) throw new HttpError(502, `Cancelled ${canceled}; ${failed.length} couldn't be: ${failed.slice(0, 3).join("; ")}`);
  return json({ canceled });
});

on("GET", "/api/campaigns/:id/checks", async (_q, [cid]) => json(await campaignChecks(await campaignOr404(cid))));

on("GET", "/api/campaigns/:id/preview", async (_q, [cid]) => {
  const c = await campaignOr404(cid);
  const t = await templateOr404(c.templateId);
  const own = Object.fromEntries(Object.entries((await audienceOf(c))[0] ?? {}).filter(([, v]) => v !== ""));
  const r = await render(t, c.subject, { first_name: "Asha", email: "asha@example.com", ...t.sample, ...c.vars, ...own }, await settings(), { mode: "preview", campaignId: c.id });
  return new Response(r.html, { headers: { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(r.subject) } });
});

on("POST", "/api/campaigns/:id/test", async (req, [cid]) => {
  const { to } = await body<{ to: string }>(req);
  const addrs = String(to ?? "").split(/[,\s]+/).filter(Boolean);
  if (!addrs.length || !addrs.every(isEmail)) throw new HttpError(400, "Enter one or more valid addresses");
  const c = await campaignOr404(cid);
  const s = await settings();
  for (const a of addrs) await sendTest(c, a, s);
  return json({ sent: addrs.length });
});

on("POST", "/api/campaigns/:id/send", async (req, [cid]) => {
  const c = await campaignOr404(cid);
  if (c.status !== "draft") throw new HttpError(409, `This email is already ${c.status}`);
  const { confirm } = await body<{ confirm: number }>(req);
  const { checks: found, reachable } = await campaignChecks(c);
  if (found.some((x) => x.level === "block")) throw new HttpError(400, found.filter((x) => x.level === "block").map((x) => x.text).join(" "));
  /* The browser echoes the count it showed, so a list that grew since can't go under an old "yes". */
  if (confirm !== reachable) throw new HttpError(409, `The lists now have ${reachable} people to send to; confirm again`);
  await startCampaign(c);
  return json({ ok: true });
});

/* ── uploaded templates ───────────────────────────────────────────────── */

const liquid = new Liquid({ strictVariables: false, strictFilters: true });
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]);
const MAX_HTML = 1_000_000;
/* Vercel refuses request bodies over 4.5 MB, and base64 adds a third. */
const MAX_IMAGES = 3_000_000;

type TemplateInput = { brand: Brand; name: string; subject: string; purpose?: string; html?: string; assets?: Record<string, Asset>; removeAssets?: string[] };
type Note = { level: "ok" | "warn"; text: string };

const relativeImages = (html: string) =>
  [...new Set([...html.matchAll(/src=["']((?!https?:|cid:|data:|\{\{)[^"']+)["']/gi)].map((m) => m[1].replace(/^\.?\//, "")))];

/** What someone uploading should know before it goes to real people. */
function inspect(html: string, assets: Record<string, Asset>) {
  const notes: Note[] = [];
  const missing = relativeImages(html).filter((p) => !assets[p] && !assets[p.split("/").pop() ?? p]);
  if (missing.length)
    notes.push({ level: "warn", text: `${missing.length === 1 ? "This image isn't" : "These images aren't"} uploaded and will show broken: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}. Add the files, or use full https:// links.` });
  if (!hasUnsubscribe(html)) notes.push({ level: "ok", text: "No unsubscribe link in the HTML, so Mailroom adds a standard footer with one and the postal address." });
  else if (!/\{\{-?\s*postal_address/.test(html)) notes.push({ level: "warn", text: "Has an unsubscribe link but no {{ postal_address }}. Marketing email must show a postal address." });
  if (/<script\b/i.test(html)) notes.push({ level: "warn", text: "Contains <script>. Email apps strip scripts, so anything relying on it won't work." });
  if (/<form\b/i.test(html)) notes.push({ level: "warn", text: "Contains a form. Most email apps block forms; link to a page instead." });
  return { notes, missing, footer: !hasUnsubscribe(html) };
}

async function validTemplate(b: TemplateInput, prev?: CustomTemplate) {
  if (b.brand !== "nursia" && b.brand !== "prepclever") throw new HttpError(400, "Pick a brand");
  if (!b.name?.trim()) throw new HttpError(400, "Give the template a name");
  if (!b.subject?.trim()) throw new HttpError(400, "Give it a default subject");
  const html = b.html ?? prev?.html ?? "";
  if (!html.trim()) throw new HttpError(400, "Choose an HTML file or paste the HTML");
  if (html.length > MAX_HTML) throw new HttpError(413, "That HTML is over 1 MB. Host big images and link to them instead of embedding them.");
  if (!/<(html|body|table|div|p)\b/i.test(html)) throw new HttpError(400, "That doesn't look like an HTML email");
  for (const [label, src] of [["HTML", html], ["subject", b.subject]] as const) {
    try {
      liquid.parse(src);
    } catch (e) {
      throw new HttpError(400, `The ${label} has a merge-tag mistake: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  const assets: Record<string, Asset> = { ...(prev?.assets ?? {}) };
  for (const k of b.removeAssets ?? []) delete assets[k];
  for (const [path, a] of Object.entries(b.assets ?? {})) {
    if (!IMAGE_TYPES.has(a?.mime)) throw new HttpError(400, `${path} isn't a PNG, JPEG, GIF, WebP or SVG image`);
    if (!/^[\w./-]{1,200}$/.test(path) || path.includes("..")) throw new HttpError(400, `${path} isn't a usable file name`);
    assets[path] = { mime: a.mime, base64: a.base64 };
  }
  const size = Object.values(assets).reduce((n, a) => n + (a.base64.length * 3) / 4, 0);
  if (size > MAX_IMAGES) throw new HttpError(413, "Images add up to over 3 MB. Compress them, or host them and use https:// links.");
  return { html, assets };
}

on("GET", "/api/templates", async () => json((await allTemplates(true)).map(templateMeta)));

on("GET", "/api/templates/:id/source", async (_q, [tid]) => {
  const t = await templateOr404(tid);
  return new Response(readTemplate(t).html, {
    headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${t.name.replace(/[^\w.-]+/g, "-").toLowerCase()}.html"` },
  });
});

/** Renders an upload before it's saved, images inlined, so nothing has to exist yet. */
on("POST", "/api/templates/draft-preview", async (req) => {
  const b = await body<TemplateInput & { id?: string }>(req);
  const prev = b.id ? await getCustomTemplate(b.id) : undefined;
  const subject = b.subject || prev?.subject || "(no subject)";
  const { html, assets } = await validTemplate({ ...b, name: b.name || "Draft", subject }, prev);
  const t = fromCustom({ id: "tpl_draft", brand: b.brand, name: "Draft", subject, purpose: "", html, assets, footer: !hasUnsubscribe(html), archived: false, createdAt: "", updatedAt: "" });
  const r = await render(t, subject, { first_name: "Asha", email: "asha@example.com" }, await settings(), { mode: "send" });
  const byCid = new Map(r.attachments.map((a) => [a.content_id, a]));
  const mimeOf = new Map(Object.values(assets).map((a) => [a.base64, a.mime]));
  const shown = r.html.replace(/src="cid:([^"]+)"/g, (m, cid: string) => {
    const a = byCid.get(cid);
    return a ? `src="data:${mimeOf.get(a.content) ?? "image/png"};base64,${a.content}"` : m;
  });
  return json({ html: shown, subject: r.subject, ...inspect(html, assets) });
});

on("POST", "/api/templates", async (req) => {
  const b = await body<TemplateInput>(req);
  const { html, assets } = await validTemplate(b);
  const now = new Date().toISOString();
  const me = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const t: CustomTemplate = {
    id: id("tpl"), brand: b.brand, name: b.name.trim(), subject: b.subject.trim(), purpose: b.purpose?.trim() ?? "",
    html, assets, footer: !hasUnsubscribe(html), archived: false, createdAt: now, updatedAt: now, createdBy: me?.email,
  };
  await saveCustomTemplate(t);
  return json({ id: t.id, ...inspect(html, assets) });
});

on("PUT", "/api/templates/:id", async (req, [tid]) => {
  const prev = await getCustomTemplate(tid);
  if (!prev) throw new HttpError(404, "Only uploaded templates can be edited. Download a built-in one and upload your copy.");
  const b = await body<Partial<TemplateInput> & { archived?: boolean }>(req);
  const merged = { ...b, brand: b.brand ?? prev.brand, name: b.name ?? prev.name, subject: b.subject ?? prev.subject };
  const { html, assets } = await validTemplate(merged, prev);
  const t: CustomTemplate = {
    ...prev, brand: merged.brand, name: merged.name.trim(), subject: merged.subject.trim(), purpose: (b.purpose ?? prev.purpose).trim(),
    html, assets, footer: !hasUnsubscribe(html), archived: b.archived ?? prev.archived,
  };
  await saveCustomTemplate(t);
  return json({ ok: true, ...inspect(html, assets) });
});

on("DELETE", "/api/templates/:id", async (_q, [tid]) => {
  if (!(await getCustomTemplate(tid))) throw new HttpError(404, "Only uploaded templates can be deleted");
  const [used] = await sql`select 1 from campaigns where doc->>'templateId' = ${tid} limit 1`;
  if (used) throw new HttpError(409, "An email uses this template and its results need it. Archive it instead.");
  await deleteCustomTemplate(tid);
  return json({ ok: true });
});

/* ── mailboxes ────────────────────────────────────────────────────────── */

type MailboxInput = { brand: Brand; name: string; email: string; replyTo?: string };

async function validMailbox(b: MailboxInput, all: Mailbox[], self?: string) {
  if (b.brand !== "nursia" && b.brand !== "prepclever") throw new HttpError(400, "Pick a brand");
  const email = String(b.email ?? "").trim().toLowerCase();
  const replyTo = String(b.replyTo ?? "").trim().toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, "Enter a valid sending address");
  if (replyTo && !isEmail(replyTo)) throw new HttpError(400, "Enter a valid reply-to address, or leave it empty");
  if (!b.name?.trim()) throw new HttpError(400, 'Give it a sender name, e.g. "Asha from Nursia"');
  if (all.some((m) => m.id !== self && m.brand === b.brand && m.email === email)) throw new HttpError(409, `${email} is already a mailbox for this brand`);
  const host = email.split("@")[1];
  const { data } = await listDomains();
  const d = data.find((x) => x.name === host);
  if (!d) throw new HttpError(400, `${host} isn't a sending domain on this Resend account (${data.map((x) => x.name).join(", ")}). Add and verify it in Resend first.`);
  if (!["verified", "partially_failed"].includes(d.status)) throw new HttpError(400, `${host} is ${d.status.replace("_", " ")} in Resend, so mail from it would bounce. Finish its DNS first.`);
  return { brand: b.brand, name: b.name.trim(), email, replyTo: replyTo || email };
}

on("GET", "/api/mailboxes", async () => json(await getMailboxes()));

on("POST", "/api/mailboxes", async (req) => {
  const all = await getMailboxes();
  const b = await body<MailboxInput & { isDefault?: boolean }>(req);
  const m: Mailbox = { id: id("mbx"), ...(await validMailbox(b, all)), isDefault: false, createdAt: new Date().toISOString() };
  if (b.isDefault) for (const x of all) if (x.brand === m.brand) x.isDefault = false;
  m.isDefault = !!b.isDefault || !all.some((x) => x.brand === m.brand);
  await saveMailboxes([...all, m]);
  return json(m);
});

on("PUT", "/api/mailboxes/:id", async (req, [mid]) => {
  const all = await getMailboxes();
  const m = all.find((x) => x.id === mid);
  if (!m) throw new HttpError(404, "No such mailbox");
  const b = await body<Partial<MailboxInput> & { isDefault?: boolean }>(req);
  Object.assign(m, await validMailbox({ brand: m.brand, name: b.name ?? m.name, email: b.email ?? m.email, replyTo: b.replyTo ?? m.replyTo }, all, m.id));
  if (b.isDefault) for (const x of all) if (x.brand === m.brand) x.isDefault = x === m;
  await saveMailboxes(all);
  return json(m);
});

on("DELETE", "/api/mailboxes/:id", async (_q, [mid]) => {
  const all = await getMailboxes();
  const m = all.find((x) => x.id === mid);
  if (!m) throw new HttpError(404, "No such mailbox");
  if (m.isDefault) throw new HttpError(409, "Make another mailbox the default first; automatic emails send from the default");
  await saveMailboxes(all.filter((x) => x !== m));
  return json({ ok: true });
});

/** A plain note from the mailbox, to see that it lands in an inbox and how the sender shows. */
on("POST", "/api/mailboxes/:id/test", async (req, [mid]) => {
  const m = (await getMailboxes()).find((x) => x.id === mid);
  if (!m) throw new HttpError(404, "No such mailbox");
  const { to } = await body<{ to: string }>(req);
  if (!isEmail(String(to ?? ""))) throw new HttpError(400, "Enter a valid address");
  const safe = (v: string) => v.replace(/[<>&"]/g, "");
  await sendEmail({
    from: fromLineOf(m),
    to: [to],
    reply_to: m.replyTo || undefined,
    subject: `[Test] Sending from ${m.email}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1b2333"><p>This is a test from Mailroom.</p><p>It was sent as <b>${safe(m.name)}</b> &lt;${safe(m.email)}&gt;, and replies go to ${safe(m.replyTo || m.email)}.</p><p>If it landed in spam, check the domain's DNS in Resend before sending a campaign from this address.</p></div>`,
    tags: [{ name: "kind", value: "test" }],
  });
  return json({ ok: true });
});

/* ── results & tracking ───────────────────────────────────────────────── */

on("POST", "/api/sync", async () => json(await sync()));

async function domainView(d: Domain) {
  const full = await getDomain(d.id);
  const sub = full.tracking_subdomain ?? null;
  const tracking = (full.records ?? []).filter((r) => /track/i.test(r.record) || (!!sub && r.name.split(".")[0] === sub));
  return { ...d, trackingSubdomain: sub, trackingRecords: tracking, trackingReady: tracking.length > 0 && tracking.every((r) => r.status === "verified") };
}

on("GET", "/api/domains", async () => json(await Promise.all((await listDomains()).data.map(domainView))));

on("POST", "/api/domains/:id/tracking", async (req, [did]) => {
  const b = await body<{ open: boolean; click: boolean }>(req);
  await setTracking(did, !!b.open, !!b.click);
  const after = await getDomain(did);
  if (after.open_tracking !== !!b.open || after.click_tracking !== !!b.click)
    throw new HttpError(409, `Resend didn't apply it: ${after.name} needs a verified tracking subdomain first (set it up on this card).`);
  return json({ ok: true });
});

on("POST", "/api/domains/:id/tracking-subdomain", async (req, [did]) => {
  const { subdomain } = await body<{ subdomain: string }>(req);
  const s = String(subdomain ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(s)) throw new HttpError(400, 'Use a single label like "links": letters, numbers and dashes');
  await setTrackingSubdomain(did, s);
  const { data } = await listDomains();
  return json(await domainView(data.find((x) => x.id === did)!));
});

on("POST", "/api/domains/:id/verify", async (_q, [did]) => {
  await verifyDomain(did);
  await new Promise((r) => setTimeout(r, 3000));
  const { data } = await listDomains();
  return json(await domainView(data.find((x) => x.id === did)!));
});

/* ── setup: live results and the 5-minute schedule ────────────────────── */

const WEBHOOK_EVENTS = ["email.sent", "email.delivered", "email.delivery_delayed", "email.opened", "email.clicked", "email.bounced", "email.complained"];

on("GET", "/api/setup", async () => {
  const secret = await getSetting<string>("resendWebhookSecret");
  const endpoint = `${baseUrl()}/api/webhooks/resend`;
  const hooks = await listWebhooks().catch(() => ({ data: [] }));
  let schedule = null as null | { cron: string };
  if (hosted()) {
    const all = await qstash().schedules.list().catch(() => []);
    const s = all.find((x) => x.destination === `${baseUrl()}/api/cron/tick`);
    schedule = s ? { cron: s.cron } : null;
  }
  return json({ base: baseUrl(), hosted: hosted(), liveResults: !!secret && hooks.data.some((h) => h.endpoint === endpoint), schedule });
});

/** Points Resend's webhook at this deployment and keeps the signing secret. */
on("POST", "/api/setup/webhook", async () => {
  const endpoint = `${baseUrl()}/api/webhooks/resend`;
  if (!endpoint.startsWith("https://")) throw new HttpError(400, "Live results need the hosted Mailroom; Resend can't reach localhost.");
  for (const h of (await listWebhooks()).data) if (h.endpoint === endpoint) await deleteWebhook(h.id);
  const created = await createWebhook(endpoint, WEBHOOK_EVENTS);
  await setSetting("resendWebhookSecret", created.signing_secret);
  return json({ ok: true });
});

/* ── settings & suppressions ──────────────────────────────────────────── */

on("PUT", "/api/settings", async (req) => {
  const b = await body<StoredSettings>(req);
  const s = await getSettings();
  if (b.siteUrl) s.siteUrl = b.siteUrl.trim();
  for (const k of ["nursia", "prepclever"] as const) if (b.brands?.[k]) s.brands[k] = { ...s.brands[k], ...b.brands[k] };
  await setSetting("app", s);
  return json({ ok: true });
});

on("GET", "/api/suppressions", async () => json(await listSuppressions()));

on("POST", "/api/suppressions", async (req) => {
  const { email } = await body<{ email: string }>(req);
  if (!isEmail(email ?? "")) throw new HttpError(400, "Not an email address");
  await addSuppression({ email, reason: "manual", at: new Date().toISOString() });
  return json({ ok: true });
});

on("DELETE", "/api/suppressions/:email", async (_q, [email]) => {
  try {
    await removeSuppression(decodeURIComponent(email));
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
  return json({ ok: true });
});

/* ── dispatch ─────────────────────────────────────────────────────────── */

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  try {
    for (const [method, re, h] of routes) {
      const m = req.method === method && url.pathname.match(re);
      if (m) return await h(req, m.slice(1), url);
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : Number((e as { status?: number }).status) || 500;
    if (status >= 500) console.error(e);
    return json({ error: (e as Error).message }, status >= 400 && status < 600 ? status : 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
