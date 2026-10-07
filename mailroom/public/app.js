/* Mailroom. Plain modules, no build step: served as-is by server.ts.
   The rule for every screen: one obvious next action, everything else a click away. */

const view = document.getElementById("view");
let state = null;
let meta = null; // audience presets + which sources are connected
let flowId = "nursia-onboarding";
const BRANDS = { nursia: "Nursia", prepclever: "PrepClever" };

/* ── helpers ──────────────────────────────────────────────────────────── */

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (r) => (r == null ? "–" : `${(r * 100).toFixed(r > 0 && r < 0.1 ? 1 : 0)}%`);
const int = (n) => Number(n || 0).toLocaleString();
const plural = (n, one, many = `${one}s`) => `${int(n)} ${n === 1 ? one : many}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const day = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const time = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const brandTag = (k) => `<span class="brand ${k}"><i></i>${BRANDS[k] ?? k}</span>`;

let toastTimer;
function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `on${err ? " err" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), err ? 7000 : 3200);
}

async function guard(fn) {
  try {
    return await fn();
  } catch (e) {
    toast(e.message, true);
  }
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

let me;
async function refresh() {
  if (me === undefined) {
    me = (await api("GET", "/api/me").catch(() => ({}))).email ?? null;
    const box = document.getElementById("who");
    if (box) box.innerHTML = me ? `${esc(me)} · <a href="/api/auth/logout">Sign out</a>` : "";
  }
  state = await api("GET", "/api/state");
  document.getElementById("syncedAt").textContent = state.syncedAt ? `Results updated ${when(state.syncedAt)}` : "Results not fetched yet";
}

async function loadMeta() {
  if (!meta) meta = await api("GET", "/api/audiences/meta");
  return meta;
}

/** A modal that resolves to the pressed button's value, or null. */
function ask({ title, body = "", confirm = "Confirm", cancel = "Cancel", input }) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form method="dialog"><h2>${title}</h2>${body ? `<p>${body}</p>` : ""}
      ${input ? `<label style="margin-top:16px">${input.label}<input name="v" value="${esc(input.value ?? "")}" placeholder="${esc(input.placeholder ?? "")}" ${input.type ? `type="${input.type}"` : ""} required></label>` : ""}
      <div class="acts"><button class="btn" value="" formnovalidate>${cancel}</button><button class="btn primary" value="ok">${confirm}</button></div></form>`;
    document.body.append(d);
    d.addEventListener("close", () => {
      const v = d.returnValue === "ok" ? (input ? d.querySelector("[name=v]").value : true) : null;
      d.remove();
      resolve(v);
    });
    d.showModal();
  });
}

function statusChip(c) {
  if (c.scheduled) return `<span class="chip stamp">Scheduled</span>`;
  if (c.waiting) return `<span class="chip wait">Starts ${esc(when(c.startsAt))}</span>`;
  return {
    draft: `<span class="chip">Draft</span>`,
    sending: `<span class="chip wait">Sending</span>`,
    sent: `<span class="chip ok">Sent</span>`,
    failed: `<span class="chip bad">Failed</span>`,
    canceled: `<span class="chip">Cancelled</span>`,
  }[c.status] ?? esc(c.status);
}

function postmark(iso, size = "") {
  const d = new Date(iso);
  return `<div class="postmark ${size}" aria-label="Scheduled for ${esc(day(iso))} ${esc(time(iso))}"><div class="pm">
    <small>${d.toLocaleDateString(undefined, { weekday: "short" })}</small>
    <b>${d.getDate()} ${d.toLocaleDateString(undefined, { month: "short" })}</b>
    <em>${time(iso)}</em></div></div>`;
}

/* ── home ─────────────────────────────────────────────────────────────── */

const views = {};

/** Where all the mail got to: open rate as the headline, then sent, delivered, opened, clicked on one ramp. */
function ledger(t) {
  const r = (a, b) => (b ? a / b : null);
  const open = r(t.opened, t.delivered);
  const [whole, frac] = open == null ? ["–", ""] : (Math.round(open * 1000) / 10).toFixed(1).split(".");
  const stages = [
    ["Sent", t.sent, "--d-sent", "all time"],
    ["Delivered", t.delivered, "--d-delivered", `${pct(r(t.delivered, t.sent))} of sent`],
    ["Opened", t.opened, "--d-opened", `${pct(open)} of delivered`],
    ["Clicked", t.clicked, "--d-clicked", `${pct(r(t.clicked, t.delivered))} of delivered`],
  ];
  const base = t.sent || 1;
  const seg = (n, c) => `<i style="width:${share(n, base)}%;background:var(${c})"></i>`;
  return `<section class="panel ledger" aria-label="Delivery across every email">
    <div class="ledger-top">
      <div class="ledger-hero"><span class="k">Open rate, every email</span>
        <span class="v">${whole}${frac ? `<small>.${frac}%</small>` : ""}</span>
        <span class="s">${int(t.opened)} of ${int(t.delivered)} delivered emails opened</span></div>
      <div class="ledger-flow">
        <div class="ramp" role="img" aria-label="${int(t.sent)} sent, ${int(t.delivered)} delivered, ${int(t.opened)} opened, ${int(t.clicked)} clicked">${seg(t.clicked, "--d-clicked")}${seg(t.opened - t.clicked, "--d-opened")}${seg(t.delivered - t.opened, "--d-delivered")}${seg(t.sent - t.delivered, "--d-sent")}</div>
        <div class="stages">${stages.map(([k, n, c, sub]) => `<div class="stage"><span class="lbl"><i style="background:var(${c})"></i>${k}</span><b>${int(n)}</b><span>${sub}</span></div>`).join("")}</div>
      </div>
    </div>
    <div class="ledger-foot"><span class="${t.bounced ? "bad" : ""}">Bounced <b>${int(t.bounced)}</b></span><span>Unsubscribed <b>${int(t.unsubscribed)}</b></span><span>Click-through of opens <b>${pct(r(t.clicked, t.opened))}</b></span></div>
  </section>`;
}

views.home = async () => {
  const [ov, health] = await Promise.all([api("GET", "/api/overview"), api("GET", "/api/health").catch(() => ({}))]);
  const t = ov.totals;
  const r = (a, b) => (b ? a / b : null);
  const issues = Object.entries(health).flatMap(([k, list]) => list.map((x) => ({ brand: k, ...x })));
  const scheduled = state.campaigns.filter((c) => c.scheduled || c.waiting).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recent = state.campaigns.filter((c) => c.status !== "draft" && !c.scheduled && !c.waiting && !isTest(c) && c.status !== "canceled").slice(0, 6);

  view.innerHTML = `
  <div class="page-head"><div><h1>Home</h1><p>Where your email is landing, and what goes out next.</p></div>
    <a class="btn primary big" href="#/new">New email</a></div>

  ${issues.length ? `<details class="attention"><summary>${plural(issues.length, "thing")} to fix before your next send</summary>
    <ul>${issues.map((x) => `<li><b>${BRANDS[x.brand]}:</b> ${esc(x.text)}</li>`).join("")}</ul></details>` : ""}

  ${ledger(t)}

  <div class="home-grid">
    <section class="panel flush">
      <div class="section-head" style="padding:18px 18px 0"><h2>Recent emails</h2><a href="#/emails">See all</a></div>
      ${recent.length ? emailTable(recent) : `<div class="empty"><h2>Nothing sent yet</h2><p>Pick a template and a list, then send it now or schedule it.</p><a class="btn primary" href="#/new">New email</a></div>`}
    </section>
    <div class="form">
      <section class="panel flush" id="autoPanel"><div class="section-head" style="padding:18px 18px 0"><h2>Automations</h2><a href="#/automations">Manage</a></div><p class="muted small" style="padding:0 18px 18px">Loading…</p></section>
      <section class="panel"><h2>Coming up</h2>
        ${scheduled.length ? `<ul class="upcoming">${scheduled.map((c) => `<li>
          <div class="date-tile"><b>${new Date(c.startsAt).getDate()}</b><span>${new Date(c.startsAt).toLocaleDateString(undefined, { month: "short" })}</span></div>
          <div><a href="#/email/${c.id}">${esc(c.name)}</a><div class="muted small">${time(c.startsAt)}, to ${plural(c.waiting ? c.stats.queued : c.stats.recipients, "person", "people")}</div></div></li>`).join("")}</ul>`
        : `<p class="muted small" style="margin-top:6px">Nothing scheduled. Choose "Schedule" on the last step of a new email.</p>`}
      </section>
    </div>
  </div>

  <section class="panel" style="margin-top:20px"><h2>Last 30 days</h2>${lineChart(ov.series)}</section>`;
  bindRows();

  /* Every automation that's on: when it next sends and how its email is doing. One quick read, no app data. */
  api("GET", "/api/flows/summary").then((all) => {
    const el = document.getElementById("autoPanel");
    if (!el) return;
    const on = all.filter((f) => f.autoRun).sort((a, b) => (a.nextAt ?? "").localeCompare(b.nextAt ?? ""));
    const off = all.length - on.length;
    el.innerHTML = `<div class="section-head" style="padding:18px 18px 4px"><h2>Automations</h2><a href="#/automations">Manage</a></div>
      ${on.length ? `<ul class="autos">${on.map((f) => `<li><a href="#/automations" data-auto="${f.id}">
        <span class="nm"><span class="live" aria-hidden="true"></span>${esc(f.name)}</span>
        <span class="nx">${f.nextAt ? `Next ${time(f.nextAt)}` : ""}</span>
        <span class="st num">${int(f.totals.sent)} sent<span class="muted">${f.totals.delivered ? `${pct(f.totals.openRate)} opened` : "–"}</span></span></a></li>`).join("")}</ul>`
        : `<p class="muted small" style="padding:0 18px 18px">No automations are on. Switch one on in Automations.</p>`}
      ${off ? `<p class="muted small" style="padding:10px 18px 16px;border-top:1px solid var(--line)">${plural(off, "automation")} off</p>` : ""}`;
    el.querySelectorAll("[data-auto]").forEach((a) => a.addEventListener("click", () => { flowId = a.dataset.auto; }));
  }).catch(() => {
    const el = document.getElementById("autoPanel");
    if (el) el.querySelector("p").textContent = "Couldn't load automations. Refresh to try again.";
  });
};

const isTest = (c) => /^test\b/i.test(c.name);
const share = (a, b) => (b ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);

/** State, then how far the mail got: delivered of sent, and a bar of delivered/opened/clicked. */
function statusCell(c) {
  const st = c.stats;
  let detail = "";
  if (c.status === "draft") detail = `Edited ${when(c.createdAt)}`;
  else if (c.scheduled) detail = `To ${plural(st.recipients, "person", "people")}`;
  else if (c.waiting) detail = `${int(st.queued)} waiting, ${int(st.sent)} sent`;
  else if (st.sent || st.queued) detail = st.queued
    ? `${int(st.sent)} of ${int(st.sent + st.queued)} sent`
    : `${int(st.delivered)} of ${int(st.sent)} delivered${st.bounced ? `, ${int(st.bounced)} bounced` : ""}`;
  else if (st.failed) detail = `${int(st.failed)} failed`;
  const base = st.sent || 1;
  const bar = st.sent && c.status !== "draft" && !c.scheduled
    ? `<span class="mini" aria-hidden="true"><i style="width:${share(st.clicked, base)}%;background:var(--d-clicked)"></i><i style="width:${share(st.opened - st.clicked, base)}%;background:var(--d-opened)"></i><i style="width:${share(st.delivered - st.opened, base)}%;background:var(--d-delivered)"></i><i style="width:${share(st.sent - st.delivered, base)}%;background:var(--d-sent)"></i></span>`
    : "";
  return `<div class="status-cell">${statusChip(c)}${bar}${detail ? `<span class="detail">${detail}</span>` : ""}</div>`;
}

function rateCell(c, kind) {
  if (c.status === "draft" || c.scheduled || !c.stats.delivered) return `<span class="muted">–</span>`;
  const r = kind === "click" ? c.stats.clickRate : c.stats.openRate;
  return `<span class="rate ${kind}"><b>${pct(r)}</b><span class="bar"><i style="width:${share(r ?? 0, 1)}%"></i></span></span>`;
}

function emailTable(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>Email</th><th>Status</th><th class="r">Recipients</th><th class="r">Open rate</th><th class="r">Click rate</th></tr></thead><tbody>
  ${rows.map((c) => `<tr class="link" data-href="#/email/${c.id}">
    <td><b>${esc(c.name)}</b>${isTest(c) ? `<span class="tag-test">Test</span>` : ""}<span class="sub">${brandTag(c.brand)}&ensp;${c.scheduled ? `goes out ${when(c.scheduledAt)}` : c.waiting ? `starts ${when(c.startsAt)}` : c.status === "draft" ? `edited ${when(c.createdAt)}` : when(c.sentAt ?? c.createdAt)}</span></td>
    <td>${statusCell(c)}</td>
    <td class="r num">${int(c.stats.recipients)}</td>
    <td class="r">${rateCell(c, "open")}</td>
    <td class="r">${rateCell(c, "click")}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function bindRows() {
  view.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.dataset.href)));
}

function lineChart(series) {
  const W = 760, H = 200, L = 30, B = 22, T = 8;
  const max = Math.max(4, ...series.flatMap((p) => [p.sent, p.opened, p.clicked]));
  const top = Math.ceil(max / 4) * 4;
  const x = (i) => L + (i * (W - L - 8)) / Math.max(1, series.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const path = (k) => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const grid = [0, 2, 4].map((g) => {
    const v = (top / 4) * g;
    return `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }).join("");
  const last = series.length - 1;
  const ticks = series.map((p, i) => ((i % 7 === 0 && last - i >= 4) || i === last) ? `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${new Date(p.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</text>` : "").join("");
  const hits = series.map((p, i) => `<rect x="${x(i) - 10}" y="${T}" width="20" height="${H - T - B}" fill="transparent"><title>${p.date}: ${p.sent} sent, ${p.opened} opened, ${p.clicked} clicked</title></rect>`).join("");
  const line = (k, c) => `<path d="${path(k)}" fill="none" stroke="var(${c})" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<div class="legend"><span><i style="background:var(--d-delivered)"></i>Sent</span><span><i style="background:var(--d-opened)"></i>Opened</span><span><i style="background:var(--d-clicked)"></i>Clicked</span></div>
  <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Emails sent, opened and clicked per day over the last 30 days">${grid}${ticks}${line("sent", "--d-delivered")}${line("opened", "--d-opened")}${line("clicked", "--d-clicked")}${hits}</svg></div>`;
}

/* ── composer: Email → People → Send ──────────────────────────────────── */

let draft = null;
const firstContact = new Map();

function freshDraft(brand) {
  return { step: 1, brand: brand ?? store("brand") ?? "nursia", templateId: null, listIds: [], subject: "", from: "", replyTo: "", name: "", vars: {}, when: "now", at: "", id: null };
}

views.new = (params) => {
  const tid = params.get("template");
  if (!draft || params.get("fresh") !== null || location.hash === "#/new" && !draft.templateId) draft = freshDraft();
  if (tid && state.templates.some((t) => t.id === tid)) {
    const t = state.templates.find((x) => x.id === tid);
    draft = { ...freshDraft(t.brand), templateId: t.id, step: 2 };
    applyTemplateDefaults(t);
  }
  renderComposer();
};

/* ── mailboxes: who an email comes from ── */
const fromLine = (m) => `${m.name} <${m.email}>`;
const mailboxesOf = (brand) => (state.mailboxes ?? []).filter((m) => m.brand === brand);
const defaultMailbox = (brand) => mailboxesOf(brand).find((m) => m.isDefault) ?? mailboxesOf(brand)[0];
const addressOf = (from) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

function mailboxOptions(brand, current) {
  const mine = mailboxesOf(brand);
  const known = mine.some((m) => m.email === addressOf(current));
  return `${known || !current ? "" : `<option value="${esc(current)}" selected>${esc(current)} (no longer a mailbox)</option>`}
    ${mine.map((m) => `<option value="${esc(fromLine(m))}" data-reply="${esc(m.replyTo)}" ${m.email === addressOf(current) ? "selected" : ""}>${esc(m.name)} &lt;${esc(m.email)}&gt;${m.isDefault ? " (default)" : ""}</option>`).join("")}`;
}

function applyTemplateDefaults(t) {
  const b = state.settings.brands[t.brand];
  const m = defaultMailbox(t.brand);
  draft.brand = t.brand;
  draft.subject = t.subject;
  draft.from = m ? fromLine(m) : `${b.fromName} <${b.fromEmail}>`;
  draft.replyTo = m?.replyTo ?? b.replyTo;
  draft.name = t.name;
  draft.vars = {};
}

/** The picked lists as one audience. The count is before de-duplication; the send step shows the exact number. */
function picked() {
  const ls = state.lists.filter((x) => draft.listIds.includes(x.id));
  if (!ls.length) return null;
  return {
    id: ls[0].id,
    ids: ls.map((x) => x.id),
    lists: ls,
    name: ls.map((x) => x.name).join(" + "),
    count: ls.reduce((a, x) => a + x.count, 0),
    fields: [...new Set(ls.flatMap((x) => x.fields))],
  };
}

function stepper() {
  const t = state.templates.find((x) => x.id === draft.templateId);
  const l = picked();
  const steps = [
    ["Email", t ? t.name : ""],
    ["People", l ? (l.lists.length > 1 ? `${l.lists.length} lists` : plural(l.count, "person", "people")) : ""],
    ["Send", draft.when === "later" && draft.at ? `${day(draft.at)}, ${time(draft.at)}` : ""],
  ];
  const reachable = [true, !!t, !!t && !!l];
  return `<ol class="stepper">${steps.map(([label, v], i) => `<li class="${draft.step === i + 1 ? "on" : draft.step > i + 1 ? "done" : ""}">
    <button data-step="${i + 1}" ${reachable[i] ? "" : "disabled"} ${draft.step === i + 1 ? 'aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${label}</span><span class="v">${esc(v)}</span></button></li>`).join("")}</ol>`;
}

function renderComposer() {
  const body = draft.step === 1 ? stepEmail() : draft.step === 2 ? "" : "";
  view.innerHTML = `<div class="page-head"><div><h1>${draft.id ? "Edit email" : "New email"}</h1></div>
    ${draft.id ? `<button class="btn quiet" id="discard">Delete draft</button>` : ""}</div>
    ${stepper()}<div id="stepBody">${body}</div>`;
  view.querySelectorAll(".stepper button").forEach((b) => b.addEventListener("click", () => { draft.step = Number(b.dataset.step); renderComposer(); }));
  view.querySelector("#discard")?.addEventListener("click", () => guard(async () => {
    if (!(await ask({ title: "Delete this draft?", body: "Nothing has been sent. This can't be undone.", confirm: "Delete draft" }))) return;
    await api("DELETE", `/api/campaigns/${draft.id}`);
    draft = null;
    await refresh();
    location.hash = "#/emails?tab=drafts";
  }));
  if (draft.step === 1) bindStepEmail();
  if (draft.step === 2) stepPeople();
  if (draft.step === 3) stepSend();
}

/* Step 1 — pick a brand, then a template by how it looks. */
function stepEmail() {
  const mine = state.templates.filter((t) => t.brand === draft.brand);
  const groups = {};
  for (const t of mine) (groups[t.group] ||= []).push(t);
  return `<div class="row" style="justify-content:space-between;margin-bottom:22px">
    <p class="muted">Pick the email to send. You can change the subject on the last step.</p>
    <div class="row"><a class="btn quiet sm" href="#/templates/new?brand=${draft.brand}">Upload a template</a>
    <div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button data-brand="${k}" class="${draft.brand === k ? "on" : ""}">${v}</button>`).join("")}</div></div></div>
    ${Object.entries(groups).map(([g, ts]) => `<div class="tpl-group"><h2>${esc(g)}</h2><div class="tpl-grid">
      ${ts.map((t) => `<button class="tpl ${t.id === draft.templateId ? "on" : ""}" data-tpl="${t.id}">
        <div class="thumb"><iframe loading="lazy" src="/api/templates/${t.id}/preview" title="" tabindex="-1" aria-hidden="true"></iframe></div>
        <div class="meta"><h3>${esc(t.name)}${t.custom ? ` <span class="tag-up">Uploaded</span>` : ""}</h3><p>${esc(t.purpose ?? "")}</p></div></button>`).join("")}
    </div></div>`).join("")}`;
}

function bindStepEmail() {
  view.querySelectorAll("[data-brand]").forEach((b) => b.addEventListener("click", () => {
    draft = { ...freshDraft(b.dataset.brand), listIds: draft.listIds };
    store("brand", b.dataset.brand);
    renderComposer();
  }));
  view.querySelectorAll("[data-tpl]").forEach((b) => b.addEventListener("click", () => {
    const t = state.templates.find((x) => x.id === b.dataset.tpl);
    if (draft.templateId !== t.id) {
      applyTemplateDefaults(t);
      draft.templateId = t.id;
      /* Keep a list picked from the Audience page, unless it belongs to the other brand. */
      draft.listIds = draft.listIds.filter((id) => { const l = state.lists.find((x) => x.id === id); return !(l?.db && l.db !== t.brand); });
    }
    draft.step = 2;
    renderComposer();
  }));
}

/* Step 2 — who gets it. A suggestion first, then existing lists. */
async function stepPeople() {
  const box = view.querySelector("#stepBody");
  const t = state.templates.find((x) => x.id === draft.templateId);
  const m = await loadMeta();
  const preset = t.suggest && m.presets.find((p) => p.id === t.suggest.preset && p.dbs.includes(t.brand));
  const canSuggest = preset && m.configured[t.brand];
  const lists = state.lists.filter((l) => !l.db || l.db === t.brand).sort((a, b) => (b.refreshedAt ?? b.createdAt).localeCompare(a.refreshedAt ?? a.createdAt));

  box.innerHTML = `<p class="muted" style="margin-bottom:18px">Who should get "${esc(t.name)}"?</p>
    <p class="small muted" style="margin:-8px 0 14px">Tick one or more. Anyone on several lists gets it once.</p>
    <div class="choices" role="group" aria-label="Recipients">
      ${canSuggest ? `<button class="choice suggested multi" id="suggest">
        <span class="dot"></span>
        <span><span class="tag">Suggested for this email</span><br><b>${esc(preset.label)}</b><br><span class="what">${esc(preset.description)} Pulled fresh from the ${BRANDS[t.brand]} app.</span></span>
        <span class="count num" id="suggestCount">…<small>people</small></span></button>` : ""}
      ${lists.map((l) => `<button class="choice multi ${draft.listIds.includes(l.id) ? "on" : ""}" data-list="${l.id}" role="checkbox" aria-checked="${draft.listIds.includes(l.id)}">
        <span class="dot"></span>
        <span><b>${esc(l.name)}</b><br><span class="what">${esc(l.source ?? "Uploaded list")}, updated ${when(l.refreshedAt ?? l.createdAt)}</span></span>
        <span class="count num">${int(l.count)}<small>${l.count === 1 ? "person" : "people"}</small></span></button>`).join("")}
    </div>
    ${!lists.length && !canSuggest ? `<div class="empty"><h2>No lists for ${BRANDS[t.brand]} yet</h2><p>Make a list from the app's data or upload a spreadsheet.</p></div>` : ""}
    <div class="row" style="margin-top:22px;justify-content:space-between">
      <a href="#/audience/new">Make a new list</a>
      <button class="btn primary big" id="next" ${draft.listIds.length ? "" : "disabled"}>Continue</button></div>`;

  let suggestDef = null;
  if (canSuggest) {
    suggestDef = { source: "supabase", db: t.brand, preset: preset.id, params: t.suggest.params ?? {} };
    api("POST", "/api/audiences/preview", { def: suggestDef })
      .then((r) => { const el = document.getElementById("suggestCount"); if (el) el.innerHTML = `${int(r.count)}<small>${r.count === 1 ? "person" : "people"}</small>`; })
      .catch((e) => { const el = document.getElementById("suggestCount"); if (el) el.innerHTML = `<small>${esc(e.message)}</small>`; });
  }

  const choose = (listId) => {
    draft.listIds = draft.listIds.includes(listId) ? draft.listIds.filter((x) => x !== listId) : [...draft.listIds, listId];
    view.querySelectorAll("[data-list]").forEach((c) => { const on = draft.listIds.includes(c.dataset.list); c.classList.toggle("on", on); c.setAttribute("aria-checked", on); });
    view.querySelector("#next").disabled = !draft.listIds.length;
    const v = view.querySelectorAll(".stepper .v")[1];
    const p = picked();
    if (v) v.textContent = p ? (p.lists.length > 1 ? `${p.lists.length} lists` : plural(p.count, "person", "people")) : "";
  };
  view.querySelectorAll("[data-list]").forEach((b) => b.addEventListener("click", () => choose(b.dataset.list)));
  view.querySelector("#suggest")?.addEventListener("click", (e) => guard(async () => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const name = `${preset.label}, ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
      const s = await api("POST", "/api/audiences/save", { def: suggestDef, name });
      await refresh();
      draft.listIds = [...draft.listIds, s.id];
      toast(`Made a list of ${plural(s.added, "person", "people")} and ticked it`);
      renderComposer();
    } finally { btn.disabled = false; }
  }));
  view.querySelector("#next").addEventListener("click", () => { draft.step = 3; renderComposer(); });
}

/* Step 3 — check it, then send now or schedule. */
async function stepSend() {
  const box = view.querySelector("#stepBody");
  const t = state.templates.find((x) => x.id === draft.templateId);
  const l = picked();
  if (!t || !l) { draft.step = t ? 2 : 1; return renderComposer(); }

  const in30 = new Date(Date.now() + 30 * 86400_000);
  const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const quick = (() => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
    const monday = new Date(); monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7)); monday.setHours(9, 0, 0, 0);
    const evening = new Date(); evening.setHours(18, 0, 0, 0);
    const opts = [];
    if (evening > new Date(Date.now() + 30 * 60000)) opts.push(["This evening, 18:00", evening]);
    opts.push(["Tomorrow, 9:00", tomorrow], [`${monday.toLocaleDateString(undefined, { weekday: "long" })}, 9:00`, monday]);
    return opts;
  })();

  box.innerHTML = `<div class="compose">
    <div class="form">
      <label>Subject<input id="subject" value="${esc(draft.subject)}" autocomplete="off"><span class="hint">You can use {{first_name}} and the other fields from the list.</span></label>
      <div class="panel flush preview">
        <div class="preview-bar"><span class="small muted" id="pvAs">Preview</span>
          <div class="seg" role="group" aria-label="Preview size"><button class="on" data-w="100%">Desktop</button><button data-w="390px">Phone</button></div></div>
        <div class="preview-frame"><iframe id="pv" title="Email preview"></iframe></div>
      </div>
    </div>

    <aside class="side-panel">
      <div class="panel form">
        <dl class="kv">
          <div><dt>To</dt><dd><b id="toCount">${plural(l.count, "person", "people")}</b><br><span class="muted small">${l.lists.map((x) => esc(x.name)).join("<br>")}</span></dd></div>
        </dl>
        <label>From<select id="from">${mailboxOptions(t.brand, draft.from)}</select>
          <span class="hint">${mailboxesOf(t.brand).length > 1 ? "" : "Only one mailbox so far. "}<a href="#/settings">Manage mailboxes</a></span></label>
        <details><summary>More options</summary>
          <div class="form" style="margin-top:14px">
            <label>Replies go to<input id="replyTo" value="${esc(draft.replyTo)}"></label>
            <label>Name in your list of emails<input id="name" value="${esc(draft.name)}"></label>
          </div></details>
      </div>

      <div class="panel form" id="fills" hidden></div>

      <div class="panel form">
        <h2>When</h2>
        <div class="when" role="radiogroup" aria-label="When to send">
          <button class="choice ${draft.when === "now" ? "on" : ""}" data-when="now" role="radio" aria-checked="${draft.when === "now"}"><span class="dot"></span><b>Now</b></button>
          <button class="choice ${draft.when === "later" ? "on" : ""}" data-when="later" role="radio" aria-checked="${draft.when === "later"}"><span class="dot"></span><b>Schedule</b></button>
        </div>
        <div id="later" ${draft.when === "later" ? "" : "hidden"} class="form">
          <div class="quick">${quick.map(([label, d]) => `<button data-at="${d.toISOString()}" class="${draft.at === d.toISOString() ? "on" : ""}">${label}</button>`).join("")}</div>
          <label>Date and time<input type="datetime-local" id="at" min="${toLocal(new Date(Date.now() + 5 * 60000))}" max="${toLocal(in30)}" value="${draft.at ? toLocal(new Date(draft.at)) : ""}"><span class="hint">Your local time. Up to 30 days ahead; Resend sends it even if this laptop is off.</span></label>
          <div class="postmark-wrap" id="pm"></div>
        </div>
      </div>

      <div class="panel form">
        <h2>Before you send</h2>
        <ul class="checks" id="checks"><li class="muted">Checking…</li></ul>
        <button class="btn primary big" id="go" disabled>Send</button>
        <div class="row" style="justify-content:space-between">
          <button class="btn quiet sm" id="test">Send me a test</button>
          <button class="btn quiet sm" id="saveDraft">Save draft</button>
        </div>
      </div>
    </aside></div>`;

  const $ = (s) => box.querySelector(s);
  const pv = $("#pv");

  const readForm = () => {
    draft.subject = $("#subject").value;
    draft.from = $("#from").value;
    draft.replyTo = $("#replyTo").value;
    draft.name = $("#name").value;
    box.querySelectorAll("[data-var]").forEach((i) => { if (i.value) draft.vars[i.dataset.var] = i.value; else delete draft.vars[i.dataset.var]; });
  };

  async function persist() {
    readForm();
    const body = {
      name: draft.name, templateId: draft.templateId, listIds: draft.listIds, from: draft.from, replyTo: draft.replyTo,
      subject: draft.subject, vars: draft.vars, scheduledAt: draft.when === "later" ? draft.at : "",
    };
    if (draft.id) await api("PUT", `/api/campaigns/${draft.id}`, body);
    else draft.id = (await api("POST", "/api/campaigns", body)).id;
    return draft.id;
  }

  let pvTimer;
  const preview = () => {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(async () => {
      readForm();
      if (!firstContact.has(l.id)) firstContact.set(l.id, (await api("GET", `/api/lists/${l.id}`)).contacts[0] ?? {});
      const first = firstContact.get(l.id);
      const vars = { ...t.sample, ...draft.vars, ...Object.fromEntries(Object.entries(first).filter(([, v]) => v)) };
      const res = await fetch(`/api/templates/${t.id}/preview?subject=${encodeURIComponent(draft.subject)}&vars=${encodeURIComponent(JSON.stringify(vars))}`);
      $("#pvAs").innerHTML = `<b>${esc(decodeURIComponent(res.headers.get("x-subject") || ""))}</b>${first.email ? `<br>as ${esc(first.email)} would see it` : ""}`;
      pv.srcdoc = (await res.text()).replace("<head>", '<head><base target="_blank">');
    }, 250);
  };

  /* Fallbacks: one box per field that some people on the list don't have.
     Their own value always wins; the fallback only fills the gaps. */
  let gaps = [];
  const loadFields = async () => {
    const fields = await api("GET", `/api/fields?templateId=${t.id}&listIds=${l.ids.join(",")}&subject=${encodeURIComponent(draft.subject)}`);
    gaps = fields.filter((f) => f.missing > 0);
    const box2 = $("#fills");
    box2.hidden = !gaps.length;
    if (!gaps.length) return;
    box2.innerHTML = `<h2>Missing details</h2>
      <p class="small muted" style="margin-top:-8px">Some people don't have every detail this email uses. Choose what to show them instead.</p>
      ${gaps.map((f) => `<label>${esc(f.name.replace(/_/g, " "))}
        <input data-var="${esc(f.name)}" value="${esc(draft.vars[f.name] ?? "")}" placeholder="${esc(f.suggested ? `e.g. ${f.suggested}` : f.hasDefault ? "Leave empty to use the email's own wording" : "Type a fallback")}">
        <span class="hint">${f.missing === f.total ? `Nobody on this list has it.` : `${int(f.missing)} of ${plural(f.total, "person", "people")} don't have it; everyone else gets their own.`}
        ${f.hasDefault ? " If left empty, the email words around it." : " If left empty, it shows as a blank."}</span></label>`).join("")}`;
    box2.querySelectorAll("[data-var]").forEach((i) => i.addEventListener("input", () => { readForm(); preview(); renderChecks(); }));
  };
  const blankRisks = () => gaps.filter((f) => !f.hasDefault && !(draft.vars[f.name] ?? "").trim());

  let checks = [];
  let reachable = l.count;
  const renderGo = () => {
    const go = $("#go");
    const blocked = checks.some((x) => x.level === "block");
    const later = draft.when === "later";
    const okTime = !later || (draft.at && Date.parse(draft.at) > Date.now() + 60000 && Date.parse(draft.at) < in30.getTime());
    go.disabled = blocked || !okTime || !reachable;
    go.textContent = later
      ? (draft.at ? `Schedule for ${day(draft.at)}, ${time(draft.at)}` : "Pick a time to schedule")
      : `Send to ${plural(reachable, "person", "people")}`;
    $("#pm").innerHTML = later && draft.at ? `${postmark(draft.at)}<p class="small muted">Goes out ${day(draft.at)} at ${time(draft.at)}. You can cancel it until then.</p>` : "";
    const stepV = view.querySelectorAll(".stepper .v")[2];
    if (stepV) stepV.textContent = later && draft.at ? `${day(draft.at)}, ${time(draft.at)}` : "";
  };

  const loadChecks = async () => {
    const id = await persist();
    const r = await api("GET", `/api/campaigns/${id}/checks`);
    checks = r.checks;
    reachable = r.reachable;
    $("#toCount").textContent = plural(reachable, "person", "people");
    renderChecks();
  };

  const renderChecks = () => {
    const all = [...checks, ...blankRisks().map((f) => ({ level: "warn", text: `${plural(f.missing, "person", "people")} would see a blank where "${f.name.replace(/_/g, " ")}" goes. Add a fallback under Missing details.` }))];
    $("#checks").innerHTML = (all.length ? all : [{ level: "ok", text: "Everything checks out." }])
      .map((x) => `<li class="${x.level}"><span class="i">${x.level === "ok" ? "✓" : x.level === "block" ? "✕" : "!"}</span><span>${esc(x.text)}</span></li>`).join("");
    renderGo();
  };

  box.querySelectorAll(".seg [data-w]").forEach((b) => b.addEventListener("click", () => {
    box.querySelectorAll(".seg [data-w]").forEach((x) => x.classList.toggle("on", x === b));
    pv.style.width = b.dataset.w;
  }));
  box.querySelectorAll("[data-when]").forEach((b) => b.addEventListener("click", () => {
    draft.when = b.dataset.when;
    box.querySelectorAll("[data-when]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); });
    $("#later").hidden = draft.when !== "later";
    renderGo();
  }));
  box.querySelectorAll("[data-at]").forEach((b) => b.addEventListener("click", () => {
    draft.at = b.dataset.at;
    box.querySelectorAll("[data-at]").forEach((x) => x.classList.toggle("on", x === b));
    $("#at").value = toLocal(new Date(draft.at));
    renderGo();
  }));
  $("#at").addEventListener("input", (e) => {
    draft.at = e.target.value ? new Date(e.target.value).toISOString() : "";
    box.querySelectorAll("[data-at]").forEach((x) => x.classList.toggle("on", x.dataset.at === draft.at));
    renderGo();
  });
  box.querySelectorAll("#subject, [data-var]").forEach((i) => i.addEventListener("input", preview));
  $("#from").addEventListener("change", (e) => {
    /* A different mailbox brings its own reply-to, unless someone typed one on purpose. */
    const prevReply = mailboxesOf(t.brand).find((m) => fromLine(m) === draft.from)?.replyTo;
    const reply = e.target.selectedOptions[0]?.dataset.reply;
    if (reply && (!$("#replyTo").value || $("#replyTo").value === prevReply)) $("#replyTo").value = reply;
    guard(loadChecks);
  });

  $("#test").addEventListener("click", () => guard(async () => {
    const to = await ask({ title: "Send yourself a test", body: `It arrives with "[Test]" in the subject, filled in as the first person on the list would see it.`, confirm: "Send test", input: { label: "Send to", value: store("testTo") ?? "", placeholder: "you@nursia.io" } });
    if (!to) return;
    store("testTo", to);
    const id = await persist();
    const r = await api("POST", `/api/campaigns/${id}/test`, { to });
    toast(`Test sent to ${plural(r.sent, "address", "addresses")}`);
  }));
  $("#saveDraft").addEventListener("click", () => guard(async () => {
    await persist();
    await refresh();
    toast("Draft saved");
    draft = null;
    location.hash = "#/emails?tab=drafts";
  }));
  $("#go").addEventListener("click", () => guard(async () => {
    await loadChecks();
    if ($("#go").disabled) return;
    const later = draft.when === "later";
    const yes = await ask({
      title: later ? `Schedule for ${day(draft.at)}, ${time(draft.at)}?` : `Send to ${plural(reachable, "person", "people")} now?`,
      body: later
        ? `"${esc(draft.subject)}" goes to ${plural(reachable, "person", "people")} on ${esc(l.name)}. The list is locked in now; you can cancel until it goes out.`
        : `"${esc(draft.subject)}" goes to everyone on ${esc(l.name)} who hasn't unsubscribed. This can't be undone.`,
      confirm: later ? "Schedule" : "Send now",
    });
    if (!yes) return;
    const id = draft.id;
    await api("POST", `/api/campaigns/${id}/send`, { confirm: reachable });
    toast(later ? "Scheduled" : "Sending");
    draft = null;
    await refresh();
    location.hash = `#/email/${id}`;
  }));

  preview();
  guard(async () => { await loadFields(); await loadChecks(); });
  renderGo();
}

/* ── emails ───────────────────────────────────────────────────────────── */

views.emails = (params) => {
  const tab = params.get("tab") ?? "sent";
  /* Test sends go to the team; they're hidden unless asked for, so real campaigns lead. */
  const showTests = params.get("tests") === "1";
  const tests = state.campaigns.filter(isTest).length;
  const groups = {
    scheduled: state.campaigns.filter((c) => c.scheduled || c.waiting),
    sent: state.campaigns.filter((c) => c.status !== "draft" && !c.scheduled && !c.waiting),
    drafts: state.campaigns.filter((c) => c.status === "draft"),
  };
  const labels = { scheduled: "Scheduled", sent: "Sent", drafts: "Drafts" };
  const rows = (groups[tab] ?? []).filter((c) => showTests || !isTest(c));
  view.innerHTML = `<div class="page-head"><div><h1>Emails</h1></div><a class="btn primary" href="#/new">New email</a></div>
    <div class="tabs-row"><nav class="tabs" aria-label="Email status">${Object.keys(groups).map((k) => `<a href="#/emails?tab=${k}${showTests ? "&tests=1" : ""}" class="${k === tab ? "on" : ""}">${labels[k]}<span class="muted">${groups[k].filter((c) => showTests || !isTest(c)).length}</span></a>`).join("")}</nav>
    ${tests ? `<a class="small" href="#/emails?tab=${tab}${showTests ? "" : "&tests=1"}">${showTests ? "Hide test sends" : `Show ${plural(tests, "test send")}`}</a>` : ""}</div>
    <div class="panel flush">${rows.length ? emailTable(rows) : `<div class="empty"><h2>${tab === "scheduled" ? "Nothing scheduled" : tab === "drafts" ? "No drafts" : "Nothing sent yet"}</h2><p>${tab === "scheduled" ? 'Choose "Schedule" on the last step of a new email.' : "Start with a template."}</p><a class="btn primary" href="#/new">New email</a></div>`}</div>`;
  bindRows();
};

let poll;
views.email = async (_p, cid) => {
  const c = await api("GET", `/api/campaigns/${cid}`);
  if (c.status === "draft") {
    const t = state.templates.find((x) => x.id === c.templateId);
    draft = { ...freshDraft(c.brand), id: c.id, templateId: c.templateId, listIds: c.listIds?.length ? c.listIds : c.listId ? [c.listId] : [], subject: c.subject, from: c.from, replyTo: c.replyTo ?? "", name: c.name, vars: c.vars ?? {}, when: c.scheduledAt ? "later" : "now", at: c.scheduledAt ?? "", step: t && (c.listIds?.length || c.listId) ? 3 : 2 };
    return renderComposer();
  }
  report(c);
};

function report(c, filter = "all") {
  const st = c.stats;
  const done = st.sent + st.failed + st.skipped;
  const filters = {
    all: ["Everyone", () => true],
    opened: ["Opened", (s) => s.opened],
    clicked: ["Clicked", (s) => s.clicked],
    unopened: ["Didn't open", (s) => s.status === "sent" && !s.opened],
    bounced: ["Bounced", (s) => s.bounced || s.complained],
    failed: ["Not sent", (s) => ["failed", "skipped", "canceled"].includes(s.status)],
  };
  const rows = c.sends.filter(filters[filter][1]);
  const sendState = (s) => s.status !== "sent" ? { failed: ["bad", "Failed"], skipped: ["", "Skipped, unsubscribed"], canceled: ["", "Cancelled"], queued: ["wait", "Waiting"] }[s.status] ?? ["", s.status]
    : s.complained ? ["bad", "Marked spam"] : s.bounced ? ["bad", "Bounced"] : s.clicked ? ["ok", "Clicked"] : s.opened ? ["stamp", "Opened"] : s.delivered ? ["", "Delivered"] : c.scheduled ? ["stamp", "Scheduled"] : ["", "Sent"];

  view.innerHTML = `
  <div class="page-head"><div><a href="#/emails" class="small">Emails</a><h1 style="margin-top:4px">${esc(c.name)}</h1>
    <p>${brandTag(c.brand)}&ensp;${esc(c.subject)}</p></div>
    <div class="row">${statusChip(c)}<a class="btn" href="/api/campaigns/${c.id}/preview" target="_blank">View email</a></div></div>

  ${c.scheduled ? `<div class="panel" style="margin-bottom:20px"><div class="postmark-wrap">${postmark(c.scheduledAt)}
    <div class="form" style="gap:10px"><h2>Goes out ${day(c.scheduledAt)} at ${time(c.scheduledAt)}</h2>
      <p class="muted">${plural(st.sent, "email")} handed to Resend, waiting. Results show up here after it sends.</p>
      <div><button class="btn danger" id="cancelSend">Cancel this send</button></div></div></div></div>` : ""}
  ${c.status === "sending" ? `<div class="panel" style="margin-bottom:20px"><b>Sending ${int(done)} of ${int(st.recipients)}</b><div class="progress"><span style="width:${(done / Math.max(1, st.recipients)) * 100}%"></span></div></div>` : ""}
  ${c.error ? `<div class="notice block" style="margin-bottom:20px">${esc(c.error)}</div>` : ""}

  ${c.scheduled ? "" : `<div class="figures">
    <div class="figure"><div class="v num">${pct(st.openRate)}</div><div class="k">Opened</div><div class="s">${int(st.opened)} of ${int(st.delivered)} delivered</div></div>
    <div class="figure"><div class="v num">${pct(st.clickRate)}</div><div class="k">Clicked</div><div class="s">${pct(st.clickToOpen)} of people who opened</div></div>
    <div class="figure"><div class="v num">${pct(st.deliveryRate)}</div><div class="k">Delivered</div><div class="s">${plural(st.bounced, "bounce")}</div></div>
    <div class="figure"><div class="v num">${int(st.unsubscribed)}</div><div class="k">Unsubscribed</div><div class="s">${int(st.complained)} marked as spam</div></div>
  </div>
  <section class="panel" style="margin-top:20px"><h2>How it went</h2><div class="funnel" style="margin-top:14px">
    ${[["Sent", st.sent, null], ["Delivered", st.delivered, st.deliveryRate], ["Opened", st.opened, st.openRate], ["Clicked", st.clicked, st.clickRate]].map(([k, n, r]) => `
      <div class="step"><span>${k}</span><div class="bar"><span style="width:${(n / Math.max(1, st.sent)) * 100}%"></span></div><span class="num r"><b>${int(n)}</b>${r == null ? "" : ` <span class="muted">${pct(r)}</span>`}</span></div>`).join("")}
  </div><p class="small muted" style="margin-top:14px">Opens are counted with a tracking image. Apple Mail counts every email as opened, and some apps block images, so compare emails with each other rather than reading the number on its own.</p></section>`}

  <section class="panel flush" style="margin-top:20px">
    <div class="section-head" style="padding:18px 18px 4px;flex-wrap:wrap"><h2>People</h2>
      <div class="filters">${Object.entries(filters).map(([k, [label, f]]) => `<button data-f="${k}" class="${k === filter ? "on" : ""}">${label} ${c.sends.filter(f).length}</button>`).join("")}</div></div>
    <div class="table-wrap"><table><thead><tr><th>Email</th><th>Status</th><th>Opened</th><th>Clicked</th></tr></thead><tbody>
    ${rows.slice(0, 1000).map((s) => { const [tone, label] = sendState(s); return `<tr><td>${esc(s.email)}${s.error ? `<span class="sub">${esc(s.error)}</span>` : ""}</td><td><span class="chip ${tone}">${label}</span></td><td class="small">${s.opened ? when(s.opened) : "–"}</td><td class="small">${s.clicked ? when(s.clicked) : "–"}</td></tr>`; }).join("")}
    </tbody></table>${rows.length > 1000 ? `<p class="muted small" style="padding:12px 16px">Showing 1,000 of ${int(rows.length)}.</p>` : ""}</div>
  </section>`;

  view.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => report(c, b.dataset.f)));
  view.querySelector("#cancelSend")?.addEventListener("click", () => guard(async () => {
    if (!(await ask({ title: "Cancel this send?", body: `None of the ${plural(st.sent, "email")} will go out. Resend can't reschedule cancelled emails, so you'd send it again as a new email.`, confirm: "Cancel send", cancel: "Keep it" }))) return;
    const r = await api("POST", `/api/campaigns/${c.id}/cancel`);
    toast(`Cancelled ${plural(r.canceled, "email")}`);
    await refresh();
    report(await api("GET", `/api/campaigns/${c.id}`));
  }));
  clearTimeout(poll);
  /* Quick while it's going out; once a minute while it waits for its start time or the gap. */
  const waiting = c.resumeAt && Date.parse(c.resumeAt) > Date.now();
  if (c.status === "sending") poll = setTimeout(async () => {
    if (location.hash !== `#/email/${c.id}`) return;
    const keep = [document.scrollingElement.scrollTop, view.scrollTop];
    report(await api("GET", `/api/campaigns/${c.id}`), filter);
    [document.scrollingElement.scrollTop, view.scrollTop] = keep;
  }, waiting ? 60_000 : 5000);
}

/* ── automations ──────────────────────────────────────────────────────── */

let flowPoll;
const openWho = new Set();

/* `quiet` refreshes in place (the background poll): no loading placeholder, same scroll position. */
views.automations = async ({ quiet = false } = {}) => {
  clearTimeout(flowPoll);
  if (!quiet) view.innerHTML = `<div class="page-head"><div><h1>Automatic emails</h1><p>Checking every account against the app…</p></div></div>`;
  const [f, all] = await Promise.all([api("GET", `/api/flows/${flowId}`), api("GET", "/api/flows/summary")]);
  if (!location.hash.startsWith("#/automations")) return;
  const scroll = [document.scrollingElement.scrollTop, view.scrollTop];
  const totalDue = f.steps.reduce((a, s) => a + s.due, 0);
  const running = f.steps.find((s) => s.running);
  const ex = f.exits;
  const keptOut = ex.subscribed + ex.suppressed + ex.internal + ex.undeliverable + (ex.noQuestions ?? 0);

  view.innerHTML = `
  <div class="page-head"><div><h1>Automatic emails</h1><p>${esc(f.description)} Each email goes only to people whose activity fits it right now, and nobody gets the same one twice.</p></div>
    <div class="row"><label class="sr-only" for="flowPick">Automation</label><select id="flowPick">${all.map((x) => `<option value="${x.id}" ${x.id === flowId ? "selected" : ""}>${esc(x.name)}${x.autoRun ? " · on" : ""}</option>`).join("")}</select>
    <button class="btn primary" id="runAll" ${totalDue && !running ? "" : "disabled"}>Send next due step</button></div></div>

  <section class="panel flush" style="margin-bottom:20px">
    <div class="section-head" style="padding:18px 18px 0"><h2>All automations</h2><span class="muted small">Totals since each one started. Pick a row to open it.</span></div>
    <div class="table-wrap"><table><thead><tr><th>Automation</th><th>Status</th><th>Schedule</th><th>Next send</th><th class="r">Sent</th><th class="r">Delivered</th><th class="r">Opened</th><th class="r">Clicked</th><th class="r">Unsubscribed</th><th class="r">Waiting</th><th>Last run</th></tr></thead><tbody>
      ${all.map((x) => `<tr class="link-row${x.id === flowId ? " on" : ""}" data-pick="${x.id}" tabindex="0">
        <td><b>${esc(x.name)}</b></td>
        <td>${x.autoRun ? `<span class="chip ok">On</span>` : `<span class="chip">Off</span>`}</td>
        <td class="small">${esc(x.schedule)}</td>
        <td class="small">${x.autoRun && x.nextAt ? `${day(x.nextAt)} ${time(x.nextAt)}` : `<span class="muted">Off</span>`}</td>
        <td class="r num">${int(x.totals.sent)}</td><td class="r num">${int(x.totals.delivered)}</td>
        <td class="r num">${pct(x.totals.openRate)}</td><td class="r num">${pct(x.totals.clickRate)}</td>
        <td class="r num">${int(x.totals.unsubscribed)}</td><td class="r num">${int(x.totals.queued)}</td>
        <td class="small muted">${x.lastRunAt ? when(x.lastRunAt) : "–"}</td></tr>`).join("")}
    </tbody></table></div>
  </section>

  <div class="figures" style="margin-bottom:20px">
    <div class="figure"><div class="v num">${int(totalDue)}</div><div class="k">Due now</div><div class="s">across ${plural(f.steps.length, "email")}</div></div>
    <div class="figure"><div class="v num">${int(f.enrolled)}</div><div class="k">Watched</div><div class="s">${f.everyone ? "everyone onboarded" : `onboarded since ${f.baselineAt ? when(f.baselineAt) : "now"}`}</div></div>
    <div class="figure"><div class="v num">${int(keptOut)}</div><div class="k">Left out</div><div class="s">${int(ex.subscribed)} paying, ${int(ex.suppressed)} unsubscribed, ${int(ex.internal)} team, ${int(ex.undeliverable)} bad address${ex.noQuestions ? `, ${int(ex.noQuestions)} exam has no questions yet` : ""}</div></div>
  </div>

  <div class="panel toggle-row" style="margin-bottom:26px">
    <div><h3>Send automatically</h3>
      <p class="small muted" style="margin-top:2px">${f.autoRun ? "On. Every 5 minutes Mailroom checks who's due and sends, even with this laptop off." : "Off. Mailroom still watches for new sign-ups, but nothing goes out until you press Send or switch this on."}</p>
      ${f.blocked?.length ? `<p class="small" style="margin-top:4px;color:var(--warn)">Paused: ${esc(f.blocked.join(" "))}</p>` : ""}
      ${f.baselineAt && !f.everyone ? `<p class="small muted" style="margin-top:4px">Watching since ${when(f.baselineAt)}. Anyone already onboarded then won't get a welcome.</p>` : ""}
      ${f.lastAutoResult ? `<p class="small muted" style="margin-top:4px">Last run: ${esc(f.lastAutoResult)}</p>` : ""}</div>
    <button type="button" class="switch" role="switch" aria-checked="${f.autoRun}" aria-label="Send automatically" id="autoSw"><span></span></button>
  </div>

  <ol class="flow">
    ${f.steps.map((s, i) => `<li class="${s.due ? "has-due" : ""}">
      <div class="n">${i + 1}</div>
      <div><div class="wait">${esc(s.wait)}</div>
        <div class="card">
          <div class="top"><div><h2>${esc(s.title)}</h2><p class="small muted">Subject: ${esc(s.subject ?? "")}</p></div>
            <div class="due"><b class="num">${int(s.due)}</b><span>due now</span></div></div>
          <p class="rule">${esc(s.rule)}</p>
          ${s.params.length ? `<details style="margin-top:10px"><summary>Change timing</summary><form class="params" data-step="${s.id}">${s.params.map((p) => `<label>${esc(p.label)}<input ${/^\d+$/.test(String(p.value)) ? 'type="number" min="0"' : 'type="text"'} name="${p.key}" value="${esc(p.value)}"></label>`).join("")}<button class="btn sm">Save</button></form></details>` : ""}
          <div class="stats"><span><b class="num">${int(s.totals.sent)}</b> sent</span><span><b class="num">${pct(s.totals.openRate)}</b> opened</span><span><b class="num">${pct(s.totals.clickRate)}</b> clicked</span>
            ${s.runs[0] ? `<a href="#/email/${s.runs[0].id}" style="margin-left:auto">Last sent ${when(s.runs[0].at)}</a>` : ""}</div>
          <div class="row acts">
            ${s.running ? `<span class="chip wait">Sending</span>` : ""}
            <button class="btn primary sm" data-send="${s.id}" data-n="${s.due}" ${s.due && !running ? "" : "disabled"}>Send to ${plural(s.due, "person", "people")}</button>
            <button class="btn sm" data-test="${s.id}">Send me a test</button>
            <a class="btn quiet sm" target="_blank" href="/api/templates/${s.template}/preview">Preview</a>
            ${s.due ? `<button class="btn quiet sm" data-who="${s.id}">${openWho.has(s.id) ? "Hide people" : "Who's due"}</button>` : ""}
          </div>
          ${openWho.has(s.id) && s.due ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Email</th><th>Name</th><th>Signed up</th><th class="r">Answered</th></tr></thead><tbody>
            ${s.dueSample.map((d) => `<tr><td>${esc(d.email)}</td><td>${esc(d.first_name)}</td><td class="small">${esc(d.signed_up)}</td><td class="r num">${esc(d.questions_answered ?? "")}</td></tr>`).join("")}
          </tbody></table>${s.due > s.dueSample.length ? `<p class="small muted">First ${s.dueSample.length} of ${int(s.due)}.</p>` : ""}</div>` : ""}
        </div></div></li>`).join("")}
  </ol>
  <p class="end muted small" style="padding-left:58px">${f.steps.length > 1 ? "The series ends after the last email." : "The welcome is the only automatic email here for now."} Anyone who pays, unsubscribes or bounces leaves straight away.</p>`;
  const pick = (id) => { flowId = id; views.automations(); };
  view.querySelector("#flowPick").addEventListener("change", (e) => pick(e.target.value));
  view.querySelectorAll("[data-pick]").forEach((r) => {
    r.addEventListener("click", () => pick(r.dataset.pick));
    r.addEventListener("keydown", (e) => { if (e.key === "Enter") pick(r.dataset.pick); });
  });

  view.querySelector("#autoSw").addEventListener("click", () => guard(async () => {
    if (!f.autoRun && !(await ask({ title: `Send ${esc(f.name)} emails automatically?`, body: "Every 5 minutes, due emails go to real people without you pressing Send. Send yourself a test of each one first.", confirm: "Turn on" }))) return;
    await api("PUT", `/api/flows/${flowId}`, { autoRun: !f.autoRun });
    toast(`Automatic sending ${f.autoRun ? "off" : "on"}`);
    views.automations();
  }));
  view.querySelectorAll(".params").forEach((form) => form.addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
    await api("PUT", `/api/flows/${flowId}`, { params: { [form.dataset.step]: Object.fromEntries(new FormData(form)) } });
    toast("Timing saved");
    views.automations();
  }); }));
  view.querySelectorAll("[data-who]").forEach((b) => b.addEventListener("click", () => { openWho.has(b.dataset.who) ? openWho.delete(b.dataset.who) : openWho.add(b.dataset.who); views.automations(); }));
  view.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    const to = await ask({ title: "Send yourself a test", body: "Filled in as the first person due would see it. Nobody is marked as sent.", confirm: "Send test", input: { label: "Send to", value: store("testTo") ?? "" } });
    if (!to) return;
    store("testTo", to);
    await api("POST", `/api/flows/${flowId}/steps/${b.dataset.test}/test`, { to });
    toast("Test sent");
  })));
  view.querySelectorAll("[data-send]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    const s = f.steps.find((x) => x.id === b.dataset.send);
    const n = Number(b.dataset.n);
    const { checks } = await api("GET", `/api/flows/${flowId}/checks`);
    const body = `Each of them is marked as having had it, so nobody gets it twice.${checks.length ? `<br><br>${checks.map((x) => `• ${esc(x.text)}`).join("<br>")}` : ""}`;
    if (checks.some((x) => x.level === "block")) return toast(checks.find((x) => x.level === "block").text, true);
    if (!(await ask({ title: `Send "${esc(s.title)}" to ${plural(n, "person", "people")}?`, body, confirm: "Send now" }))) return;
    await api("POST", `/api/flows/${flowId}/steps/${s.id}/send`, { confirm: n });
    toast("Sending");
    views.automations();
  })));
  view.querySelector("#runAll").addEventListener("click", () => guard(async () => {
    const next = f.steps.find((s) => s.due);
    if (!(await ask({ title: `Send "${esc(next.title)}" to ${plural(next.due, "person", "people")}?`, body: "One step at a time; the rest follow on the next run. Stops if the postal address is missing.", confirm: "Send" }))) return;
    const r = await api("POST", `/api/flows/${flowId}/run`);
    toast(r.result ?? "Sending");
    setTimeout(views.automations, 1500);
  }));
  if (quiet) [document.scrollingElement.scrollTop, view.scrollTop] = scroll;
  /* While a step is sending, check back every 30s; each check reads every account, and a send waiting out the gap can take hours. */
  if (running) flowPoll = setTimeout(() => location.hash.startsWith("#/automations") && views.automations({ quiet: true }), 30_000);
};

/* ── users ────────────────────────────────────────────────────────────── */

let usersBrand = store("usersBrand") ?? "nursia";
const usersUi = { q: "", filter: "all", sort: "joined", shown: 50 };
const rel = (iso) => {
  if (!iso) return "–";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  if (m < 1440 * 30) return `${Math.round(m / 1440)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });
};
const PROVIDERS = { google: "Google", email: "Email", phone: "Phone", apple: "Apple" };
const initials = (u) => (u.name || u.email || u.phone || "?").trim().charAt(0).toUpperCase();
const avatar = (u, size = 32) => u.avatar
  ? `<img class="av" src="${esc(u.avatar)}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer" loading="lazy">`
  : `<span class="av" style="width:${size}px;height:${size}px">${esc(initials(u))}</span>`;

const USER_FILTERS = {
  all: ["Everyone", () => true],
  active: ["Active this week", (u) => u.lastActive && Date.now() - Date.parse(u.lastActive) < 7 * 864e5],
  quiet: ["Quiet 30+ days", (u) => !u.lastActive || Date.now() - Date.parse(u.lastActive) > 30 * 864e5],
  new: ["Not onboarded", (u) => !u.onboarded],
  opened: ["Opened an email", (u) => u.emails.opened > 0],
  never: ["Never emailed", (u) => !u.emails.sent && u.email],
  paying: ["Paying", (u) => u.paying],
};
const USER_SORTS = {
  joined: ["Newest", (a, b) => String(b.createdAt).localeCompare(String(a.createdAt))],
  active: ["Last active", (a, b) => String(b.lastActive ?? "").localeCompare(String(a.lastActive ?? ""))],
  most: ["Most active", (a, b) => (b.answered30 + (b.events30 ?? 0) / 10) - (a.answered30 + (a.events30 ?? 0) / 10)],
};

views.users = async (params) => {
  if (params.get("brand")) usersBrand = params.get("brand");
  view.innerHTML = `<div class="page-head"><div><h1>Users</h1><p>Loading everyone who signed up…</p></div></div>`;
  const all = await api("GET", `/api/users?brand=${usersBrand}${params.has("fresh") ? "&fresh" : ""}`);
  if (!location.hash.startsWith("#/users")) return;
  const week = all.filter(USER_FILTERS.active[1]).length;
  const emailed = all.filter((u) => u.emails.sent);
  const opened = emailed.filter((u) => u.emails.opened).length;

  view.innerHTML = `
  <div class="page-head"><div><h1>Users</h1><p>Everyone who signed up, what they've done in the app${usersBrand === "nursia" ? " and on the site" : ""}, and what we've sent them.</p></div>
    <div class="row"><div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button data-ub="${k}" class="${usersBrand === k ? "on" : ""}">${v}</button>`).join("")}</div>
    <button class="btn" id="ufresh">Refresh</button></div></div>

  <div class="figures" style="margin-bottom:20px">
    <div class="figure"><div class="v num">${int(all.length)}</div><div class="k">Signed up</div><div class="s">${int(all.filter((u) => u.onboarded).length)} finished onboarding</div></div>
    <div class="figure"><div class="v num">${int(week)}</div><div class="k">Active this week</div><div class="s">${pct(all.length ? week / all.length : null)} of everyone</div></div>
    <div class="figure"><div class="v num">${int(all.filter((u) => u.answered30).length)}</div><div class="k">Practised in 30 days</div><div class="s">${int(all.reduce((a, u) => a + u.answered30, 0))} questions answered</div></div>
    <div class="figure"><div class="v num">${pct(emailed.length ? opened / emailed.length : null)}</div><div class="k">Opened an email</div><div class="s">${int(opened)} of ${int(emailed.length)} emailed</div></div>
  </div>

  <div class="toolbar">
    <input type="search" id="uq" placeholder="Search by name, email, phone or user ID" value="${esc(usersUi.q)}" aria-label="Search users">
    <select id="uf" aria-label="Show">${Object.entries(USER_FILTERS).map(([k, [l]]) => `<option value="${k}" ${k === usersUi.filter ? "selected" : ""}>${l}</option>`).join("")}</select>
    <select id="us" aria-label="Sort by">${Object.entries(USER_SORTS).map(([k, [l]]) => `<option value="${k}" ${k === usersUi.sort ? "selected" : ""}>Sort: ${l}</option>`).join("")}</select>
  </div>
  <div class="panel flush"><div class="table-wrap"><table class="users"><thead><tr>
    <th>User</th><th>Signed in with</th><th>Joined</th><th>Last active</th><th>Last 30 days</th><th>Emails</th><th>Status</th></tr></thead><tbody id="urows"></tbody></table></div>
    <div id="umore"></div></div>`;

  const draw = () => {
    const q = usersUi.q.trim().toLowerCase();
    const rows = all
      .filter(USER_FILTERS[usersUi.filter][1])
      .filter((u) => !q || [u.name, u.email, u.phone, u.id].some((v) => String(v ?? "").toLowerCase().includes(q)))
      .sort(USER_SORTS[usersUi.sort][1]);
    view.querySelector("#urows").innerHTML = rows.slice(0, usersUi.shown).map((u) => {
      const e = u.emails;
      const act = [u.sessions30 ? plural(u.sessions30, "session") : "", u.answered30 ? `${int(u.answered30)} answered${u.accuracy30 != null ? ` (${pct(u.accuracy30)})` : ""}` : "", u.events30 ? `${int(u.events30)} events` : ""].filter(Boolean).join(", ");
      return `<tr class="link" data-href="#/user/${usersBrand}/${u.id}">
        <td><div class="who">${avatar(u)}<div><b>${esc(u.name || u.email || u.phone || "No name")}</b><span class="sub">${esc(u.name ? u.email || u.phone : u.email ? u.phone : "")}${u.exam ? `${u.email || u.phone ? ", " : ""}${esc(u.exam)}` : ""}</span></div></div></td>
        <td class="small">${u.providers.map((p) => PROVIDERS[p] ?? p).join(", ") || "–"}</td>
        <td class="small" title="${esc(u.createdAt ?? "")}">${rel(u.createdAt)}</td>
        <td class="small" title="${esc(u.lastActive ?? "")}">${u.lastActive ? rel(u.lastActive) : `<span class="muted">${u.lastSignIn ? "signed in " + rel(u.lastSignIn) : "never"}</span>`}</td>
        <td class="small">${act || '<span class="muted">Nothing yet</span>'}${u.platforms.length ? `<span class="sub">${esc(u.platforms.join(", "))}</span>` : ""}</td>
        <td class="small">${e.sent ? `<span class="mailbar" title="${e.sent} sent, ${e.opened} opened, ${e.clicked} clicked"><i style="--w:100%"></i><i class="o" style="--w:${(e.opened / e.sent) * 100}%"></i><i class="c" style="--w:${(e.clicked / e.sent) * 100}%"></i></span>${int(e.sent)} sent, ${int(e.opened)} opened${e.clicked ? `, ${int(e.clicked)} clicked` : ""}` : '<span class="muted">None</span>'}</td>
        <td>${u.paying ? '<span class="chip ok">Paying</span>' : u.internal ? '<span class="chip">Team</span>' : !u.onboarded ? '<span class="chip wait">Not onboarded</span>' : u.state ? `<span class="chip">${esc(u.state.charAt(0).toUpperCase() + u.state.slice(1))}</span>` : ""}</td></tr>`;
    }).join("") || `<tr><td colspan="7"><div class="empty"><h2>Nobody matches</h2><p>Try a different search or filter.</p></div></td></tr>`;
    view.querySelector("#umore").innerHTML = rows.length > usersUi.shown
      ? `<div class="row" style="justify-content:center;padding:14px"><button class="btn" id="more">Show more (${int(rows.length - usersUi.shown)} left)</button></div>`
      : `<p class="small muted" style="padding:12px 16px">${plural(rows.length, "person", "people")}</p>`;
    view.querySelector("#more")?.addEventListener("click", () => { usersUi.shown += 100; draw(); });
    bindRows();
  };
  draw();

  let t;
  view.querySelector("#uq").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { usersUi.q = e.target.value; usersUi.shown = 50; draw(); }, 150); });
  view.querySelector("#uf").addEventListener("change", (e) => { usersUi.filter = e.target.value; usersUi.shown = 50; draw(); });
  view.querySelector("#us").addEventListener("change", (e) => { usersUi.sort = e.target.value; draw(); });
  view.querySelectorAll("[data-ub]").forEach((b) => b.addEventListener("click", () => { usersBrand = b.dataset.ub; store("usersBrand", usersBrand); usersUi.shown = 50; views.users(new URLSearchParams()); }));
  view.querySelector("#ufresh").addEventListener("click", () => views.users(new URLSearchParams("fresh")));
};

function activityChart(days) {
  const W = 720, H = 120, B = 20;
  const max = Math.max(4, ...days.map((d) => d.answered + d.events / 5));
  const bw = (W - 8) / days.length;
  const bars = days.map((d, i) => {
    const x = 4 + i * bw;
    const ha = ((H - B) * d.answered) / max, he = ((H - B) * (d.events / 5)) / max;
    return `<g><title>${d.date}: ${d.answered} answered, ${d.events} events${d.emails ? `, ${d.emails} email${d.emails > 1 ? "s" : ""}` : ""}</title>
      <rect x="${x + 1}" y="${H - B - he - ha}" width="${bw - 2}" height="${he}" rx="2" fill="var(--stamp)" opacity=".45"/>
      <rect x="${x + 1}" y="${H - B - ha}" width="${bw - 2}" height="${ha}" rx="2" fill="var(--ink)"/>
      ${d.emails ? `<circle cx="${x + bw / 2}" cy="${H - B + 9}" r="3.5" fill="var(--ok)"/>` : ""}
      <rect x="${x}" y="0" width="${bw}" height="${H}" fill="transparent"/></g>`;
  }).join("");
  const ticks = days.map((d, i) => (i % 7 === 0 ? `<text x="${4 + i * bw}" y="${H + 12}">${new Date(d.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</text>` : "")).join("");
  return `<div class="legend"><span><i style="background:var(--ink)"></i>Questions answered</span><span><i style="background:var(--stamp);opacity:.45"></i>App and site activity</span><span><i style="background:var(--ok);border-radius:50%;width:7px;height:7px"></i>Email sent</span></div>
    <div class="chart"><svg viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Daily activity over the last 30 days"><line class="grid" x1="0" x2="${W}" y1="${H - B}" y2="${H - B}"/>${bars}${ticks}</svg></div>`;
}

const TL_KINDS = { all: "Everything", app: "In the app", web: "On the site", email: "Emails", quiz: "Emailed questions" };
let tlKind = "all";

views.user = async (_p, brand, uid) => {
  view.innerHTML = `<div class="page-head"><div><a href="#/users" class="small">Users</a><h1 style="margin-top:4px">Loading…</h1></div></div>`;
  const d = await api("GET", `/api/users/${brand}/${uid}`);
  const u = d.user, b = d.behaviour, ph = b.posthog && !b.posthog.error ? b.posthog : null, p = d.profile ?? {};
  const opened = d.email.sends.filter((s) => s.opened_at).length;
  const facts = [
    ["Exam", u.exam || "–"],
    ["Exam date", p.exam_date ? new Date(p.exam_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set"],
    ["Lifecycle", u.state ? u.state.charAt(0).toUpperCase() + u.state.slice(1) : "–"],
    ["Onboarding", u.onboarded ? "Finished" : "Not finished"],
    ["Plan", u.paying ? "Paying" : "Free"],
    ...(brand === "nursia" ? [["Newsletter", p.newsletter_opt_in ? "Opted in" : "Not opted in"], ["Paywall views", int(p.paywall_view_count ?? 0)]] : []),
    ["Platforms", u.platforms.join(", ") || "–"],
    ["Signed in with", u.providers.map((x) => PROVIDERS[x] ?? x).join(", ") || "–"],
    ["Joined", when(u.createdAt)],
    ["Last sign-in", when(u.lastSignIn)],
    ["User ID", `<code>${esc(u.id)}</code>`],
  ];

  const render = () => {
    const items = d.timeline.filter((x) => tlKind === "all" || x.kind === tlKind || (tlKind === "app" && x.kind === "account"));
    view.querySelector("#tl").innerHTML = items.length ? `<ol class="timeline">${items.slice(0, 150).map((x) => `<li class="k-${x.kind}"><span class="dot"></span><div><b>${esc(x.title)}</b>${x.detail ? ` <span class="muted">${esc(x.detail)}</span>` : ""}<span class="sub" title="${esc(x.at)}">${when(x.at)}</span></div></li>`).join("")}</ol>`
      : `<p class="muted small" style="padding:8px 0">Nothing here yet.</p>`;
    view.querySelectorAll("[data-tl]").forEach((x) => x.classList.toggle("on", x.dataset.tl === tlKind));
  };

  view.innerHTML = `
  <div class="page-head"><div><a href="#/users" class="small">Users</a>
    <div class="who big" style="margin-top:8px">${avatar(u, 56)}<div><h1>${esc(u.name || u.email || u.phone || "No name")}</h1>
      <p style="margin-top:2px">${[u.email, u.phone].filter(Boolean).map(esc).join(", ")}</p></div></div></div>
    <div class="row">${ph ? `<a class="btn" href="${esc(ph.url)}" target="_blank" rel="noopener">Open in PostHog</a>` : ""}
      ${u.email ? `<a class="btn primary" href="#/new" id="emailOne">Email this person</a>` : ""}</div></div>

  <div class="figures" style="margin-bottom:20px">
    <div class="figure"><div class="v num">${u.lastActive ? rel(u.lastActive) : "Never"}</div><div class="k">Last active</div><div class="s">${plural(b.activeDays30, "active day")} in the last 30</div></div>
    <div class="figure"><div class="v num">${int(b.answeredTotal)}</div><div class="k">Questions answered</div><div class="s">${b.accuracy != null ? `${pct(b.accuracy)} correct` : "in the app"}${ph ? `, ${int(ph.top.find((t) => /question/i.test(t.label))?.count ?? 0)} on the site this month` : ""}</div></div>
    <div class="figure"><div class="v num">${int(Math.max(b.sessions, ph?.sessions ?? 0))}</div><div class="k">Sessions</div><div class="s">${b.minutes ? `${int(b.minutes)} minutes in the app` : ph ? `${int(ph.totalEvents)} events tracked` : "–"}</div></div>
    <div class="figure"><div class="v num">${d.email.sends.length ? `${opened}/${d.email.sends.length}` : "0"}</div><div class="k">Emails opened</div><div class="s">${d.email.quiz.answered ? `${d.email.quiz.right} of ${d.email.quiz.answered} emailed questions right` : "no emailed questions answered"}</div></div>
  </div>

  <div class="home-grid">
    <div class="form" style="gap:20px">
      <section class="panel"><h2>Activity, last 30 days</h2>${activityChart(b.days)}</section>
      <section class="panel"><div class="section-head" style="flex-wrap:wrap"><h2>Timeline</h2>
        <div class="filters">${Object.entries(TL_KINDS).filter(([k]) => k !== "web" || brand === "nursia").map(([k, l]) => `<button data-tl="${k}">${l}</button>`).join("")}</div></div>
        <div id="tl"></div></section>
    </div>
    <div class="form" style="gap:20px">
      <section class="panel"><h2>Email touchpoints</h2>
        ${d.email.sends.length ? `<ul class="touch">${d.email.sends.map((s) => `<li><a href="#/email/${s.campaign_id}"><b>${esc(s.name)}</b></a>
          <span class="sub">${s.sent_at ? when(s.sent_at) : s.status}${s.flow ? ", automatic" : ""}</span>
          <div class="row" style="gap:6px;margin-top:6px">${s.bounced_at ? '<span class="chip bad">Bounced</span>' : s.clicked_at ? `<span class="chip ok">Clicked${s.clicks > 1 ? ` ${s.clicks}×` : ""}</span>` : s.opened_at ? `<span class="chip stamp">Opened${s.opens > 1 ? ` ${s.opens}×` : ""}</span>` : s.delivered_at ? '<span class="chip">Delivered, not opened</span>' : `<span class="chip">${esc(s.status === "sent" ? "Sent" : s.status)}</span>`}</div></li>`).join("")}</ul>`
          : `<p class="muted small">Nothing sent to ${esc(u.email || "them")} yet.</p>`}
        ${d.email.flows.length ? `<p class="small muted" style="margin-top:10px">${d.email.flows.map((f) => `${f.flow_id.startsWith("nursia") ? "Nursia" : "PrepClever"} onboarding: ${f.baseline ? "joined before automation started" : Object.keys(f.steps).length ? `had ${Object.keys(f.steps).join(", ")}` : "waiting for the welcome"}`).join("<br>")}</p>` : ""}
      </section>
      ${ph?.top?.length ? `<section class="panel"><h2>What they do most</h2><ul class="bars">${ph.top.map((t) => `<li><span>${esc(t.label)}</span><i style="--w:${(t.count / ph.top[0].count) * 100}%"></i><b class="num">${int(t.count)}</b></li>`).join("")}</ul><p class="small muted" style="margin-top:8px">From PostHog, last 30 days.</p></section>` : ""}
      ${b.posthog?.error ? `<div class="notice warn">PostHog couldn't be read: ${esc(b.posthog.error)}</div>` : ""}
      <section class="panel"><h2>Profile</h2><dl class="kv facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${typeof v === "string" && v.startsWith("<code>") ? v : esc(v)}</dd></div>`).join("")}</dl></section>
    </div>
  </div>`;

  view.querySelectorAll("[data-tl]").forEach((x) => x.addEventListener("click", () => { tlKind = x.dataset.tl; render(); }));
  view.querySelector("#emailOne")?.addEventListener("click", (e) => guard(async () => {
    e.preventDefault();
    /* A one-person list, so the usual composer does the rest. */
    const r = await api("POST", "/api/lists", { name: `${u.name || u.email}, ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, csv: `email,first_name,user_id\n${u.email},${(u.name || "").split(" ")[0]},${u.id}` });
    await refresh();
    draft = { ...freshDraft(brand), listIds: [r.id] };
    location.hash = "#/new?keep";
  }));
  render();
};

/* ── audience ─────────────────────────────────────────────────────────── */

views.audience = async (_p, sub, kind) => {
  if (sub === "new") return kind ? newList(kind) : chooseKind();
  const sup = await api("GET", "/api/suppressions");
  view.innerHTML = `<div class="page-head"><div><h1>Audience</h1><p>Lists you can send to. Lists made from the app can be refreshed so they match who fits today.</p></div>
    <a class="btn primary" href="#/audience/new">New list</a></div>
  <div class="panel flush">${state.lists.length ? `<div class="table-wrap"><table><thead><tr><th>List</th><th class="r">People</th><th>Updated</th></tr></thead><tbody>
    ${state.lists.map((l) => `<tr class="link" data-href="#/list/${l.id}"><td><b>${esc(l.name)}</b><span class="sub">${l.db ? brandTag(l.db) + "&ensp;" : ""}${esc(l.source ?? "Uploaded list")}</span></td><td class="r num">${int(l.count)}</td><td class="small muted">${when(l.refreshedAt ?? l.createdAt)}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><h2>No lists yet</h2><p>Pull people straight from the app, or upload a spreadsheet.</p><a class="btn primary" href="#/audience/new">New list</a></div>`}</div>

  <details class="panel" style="margin-top:20px"><summary>People we never email (${int(sup.length)})</summary>
    <p class="small muted" style="margin:12px 0">Unsubscribes come from Resend on every refresh. Bounces and spam complaints are added automatically.</p>
    <form class="row" id="sup" style="margin-bottom:12px"><input name="email" type="email" placeholder="name@example.com" style="max-width:280px" required aria-label="Email to stop sending to"><button class="btn sm">Stop emailing</button></form>
    ${sup.length ? `<div class="table-wrap"><table><thead><tr><th>Email</th><th>Why</th><th>Since</th><th></th></tr></thead><tbody>
    ${sup.slice(0, 500).map((s) => `<tr><td>${esc(s.email)}</td><td>${{ unsubscribed: "Unsubscribed", bounced: "Bounced", complained: "Marked spam", manual: "Added by hand" }[s.reason]}</td><td class="small muted">${when(s.at)}</td><td class="r">${s.reason === "manual" ? `<button class="btn quiet sm" data-unsup="${esc(s.email)}">Remove</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </details>`;
  bindRows();
  view.querySelector("#sup").addEventListener("submit", (e) => { e.preventDefault(); guard(async () => { await api("POST", "/api/suppressions", { email: e.target.email.value }); toast("Added"); await refresh(); views.audience(); }); });
  view.querySelectorAll("[data-unsup]").forEach((b) => b.addEventListener("click", () => guard(async () => { await api("DELETE", `/api/suppressions/${encodeURIComponent(b.dataset.unsup)}`); await refresh(); views.audience(); })));
};

async function chooseKind() {
  const m = await loadMeta();
  const app = m.configured.nursia || m.configured.prepclever;
  view.innerHTML = `<div class="page-head"><div><a href="#/audience" class="small">Audience</a><h1 style="margin-top:4px">New list</h1><p>Where are the people coming from?</p></div></div>
  <div class="kinds">
    <button class="kind" data-kind="app" ${app ? "" : "disabled"}>
      <svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>
      <h2>From the app</h2><p>People by where they are: new, quiet, on a streak, started checkout, and more.</p></button>
    <button class="kind" data-kind="behaviour" ${m.configured.posthog && app ? "" : "disabled"}>
      <svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/></svg>
      <h2>From what they did</h2><p>People who did something in the product, like dismissing the paywall, from PostHog.</p></button>
    <button class="kind" data-kind="csv">
      <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>
      <h2>Upload a spreadsheet</h2><p>A CSV with an email column. Other columns become fields you can use in the email.</p></button>
  </div>`;
  view.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => (location.hash = `#/audience/new/${b.dataset.kind}`)));
}

let builder = { db: "nursia" };

async function newList(kind) {
  const m = await loadMeta();
  const head = (title, sub) => `<div class="page-head"><div><a href="#/audience/new" class="small">New list</a><h1 style="margin-top:4px">${title}</h1><p>${sub}</p></div></div>`;

  if (kind === "csv") {
    view.innerHTML = `${head("Upload a spreadsheet", "Needs an email column. Columns like first_name become fields you can use in the email.")}
    <form class="panel form" id="csvForm" style="max-width:640px">
      <label>List name<input name="name" required placeholder="For example: NCLEX webinar sign-ups"></label>
      <label>File<input type="file" accept=".csv,text/csv" id="file"></label>
      <details><summary>Or paste the rows</summary><textarea name="csv" id="csv" style="margin-top:10px" placeholder="email,first_name&#10;asha@example.com,Asha"></textarea></details>
      <div><button class="btn primary">Make list</button></div></form>`;
    view.querySelector("#file").addEventListener("change", async (e) => { const f = e.target.files[0]; if (f) view.querySelector("#csv").value = await f.text(); });
    view.querySelector("#csvForm").addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
      const fd = Object.fromEntries(new FormData(e.target));
      if (!fd.csv.trim()) throw new Error("Choose a file or paste some rows first");
      const r = await api("POST", "/api/lists", fd);
      toast(`List made with ${plural(r.added, "person", "people")}${r.rejected ? `; ${r.rejected} rows had no valid email` : ""}`);
      await refresh();
      location.hash = `#/list/${r.id}`;
    }); });
    return;
  }

  const ph = kind === "behaviour";
  if (!m.configured[builder.db]) builder.db = m.configured.nursia ? "nursia" : "prepclever";
  const presets = m.presets.filter((p) => p.dbs.includes(builder.db));
  if (!presets.some((p) => p.id === builder.preset)) builder.preset = presets[0]?.id;
  const preset = presets.find((p) => p.id === builder.preset);

  view.innerHTML = `${head(ph ? "From what they did" : "From the app", ph ? "Pick something people did in the product. Only people who've signed in can be matched to an email." : "Pick a group. The count updates when you preview.")}
  <div class="builder">
    <form class="panel form" id="bf">
      <div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button type="button" data-db="${k}" class="${builder.db === k ? "on" : ""}" ${m.configured[k] ? "" : "disabled"}>${v}</button>`).join("")}</div>
      ${ph ? `
        <label>Did this<select name="event" id="ev"><option>Loading…</option></select></label>
        <div class="pair"><label>At least<input type="number" min="1" name="minCount" value="${esc(builder.minCount ?? 1)}"><span class="hint">times</span></label><label>In the last<input type="number" min="1" name="days" value="${esc(builder.days ?? 30)}"><span class="hint">days</span></label></div>
        <details><summary>Leave out people who also…</summary><label style="margin-top:10px">Did this<select name="notEvent" id="notEv"><option value="">Nobody left out</option></select></label></details>`
      : `
        <label>Group<select name="preset">${presets.map((p) => `<option value="${p.id}" ${p.id === builder.preset ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select><span class="hint">${esc(preset?.description ?? "")}</span></label>
        ${(preset?.params ?? []).map((p) => p.type === "select"
          ? `<label>${esc(p.label)}<select name="p_${p.key}">${p.options.map((o) => `<option ${o === (builder.params?.[p.key] ?? p.default) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`
          : `<label>${esc(p.label)}<input type="number" min="0" name="p_${p.key}" value="${esc(builder.params?.[p.key] ?? p.default)}"></label>`).join("")}`}
      <details><summary>More options</summary><label class="row" style="flex-direction:row;font-weight:500;margin-top:10px"><input type="checkbox" name="includeInternal" style="width:auto" ${builder.includeInternal ? "checked" : ""}> Include team accounts</label></details>
      <div><button class="btn primary">Preview</button></div>
    </form>
    <div class="panel" id="res"><div class="empty"><h2>No preview yet</h2><p>Nothing is saved until you choose to.</p></div></div>
  </div>`;

  const f = view.querySelector("#bf");
  view.querySelectorAll("[data-db]").forEach((b) => b.addEventListener("click", () => { builder.db = b.dataset.db; builder.params = {}; newList(kind); }));
  f.querySelector("[name=preset]")?.addEventListener("change", (e) => { builder.preset = e.target.value; builder.params = {}; newList(kind); });
  if (ph) guard(async () => {
    const evs = await api("GET", "/api/audiences/posthog/events");
    const opts = (sel) => evs.filter((e) => !e.event.startsWith("$")).map((e) => `<option value="${esc(e.event)}" ${e.event === sel ? "selected" : ""}>${esc(e.event.replace(/_/g, " "))} (${int(e.people)} people)</option>`).join("");
    f.querySelector("#ev").innerHTML = opts(builder.event);
    f.querySelector("#notEv").innerHTML = `<option value="">Nobody left out</option>${opts(builder.notEvent)}`;
  });

  const readDef = () => {
    const v = (n) => f.querySelector(`[name=${n}]`);
    builder.includeInternal = v("includeInternal").checked;
    if (ph) {
      Object.assign(builder, { event: v("event").value, minCount: Number(v("minCount").value), days: Number(v("days").value), notEvent: v("notEvent").value || undefined });
      return { source: "posthog", db: builder.db, mode: "event", event: builder.event, minCount: builder.minCount, days: builder.days, notEvent: builder.notEvent, includeInternal: builder.includeInternal };
    }
    builder.params = {};
    f.querySelectorAll("[name^=p_]").forEach((x) => (builder.params[x.name.slice(2)] = x.value));
    return { source: "supabase", db: builder.db, preset: builder.preset, params: builder.params, includeInternal: builder.includeInternal };
  };

  f.addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
    const def = readDef();
    const out = view.querySelector("#res");
    out.innerHTML = `<div class="empty"><h2>Counting…</h2></div>`;
    try {
      const r = await api("POST", "/api/audiences/preview", { def });
      const cols = ["email", "first_name", "signed_up", "last_seen"].filter((c) => r.fields.includes(c));
      const label = ph ? def.event.replace(/_/g, " ") : presets.find((p) => p.id === def.preset)?.label;
      out.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:flex-end">
          <div><div style="font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1" class="num">${int(r.count)}</div><p class="muted">${r.count === 1 ? "person" : "people"} with an email${r.suppressed ? `, ${int(r.suppressed)} of them unsubscribed and will be skipped` : ""}</p></div>
          <form class="row" id="saveA"><input name="name" required value="${esc(`${label}, ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`)}" aria-label="List name" style="width:240px"><button class="btn primary" ${r.count ? "" : "disabled"}>Save list</button></form>
        </div>
        ${r.dropped.length ? `<p class="small muted" style="margin-top:12px">Left out: ${r.dropped.map((d) => `${int(d.count)} ${esc(d.reason)}`).join(", ")}.</p>` : ""}
        ${r.sample.length ? `<div class="table-wrap" style="margin-top:14px"><table><thead><tr>${cols.map((c) => `<th>${esc(c.replace(/_/g, " "))}</th>`).join("")}</tr></thead><tbody>
          ${r.sample.slice(0, 12).map((row) => `<tr>${cols.map((c) => `<td class="small">${esc(row[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
          ${r.count > 12 ? `<p class="small muted" style="margin-top:8px">First 12 of ${int(r.count)}.</p>` : ""}` : ""}`;
      out.querySelector("#saveA").addEventListener("submit", (e2) => { e2.preventDefault(); guard(async () => {
        const s = await api("POST", "/api/audiences/save", { def, name: e2.target.name.value });
        toast(`Saved ${plural(s.added, "person", "people")}`);
        await refresh();
        location.hash = `#/list/${s.id}`;
      }); });
    } catch (err) {
      out.innerHTML = `<div class="notice block">${esc(err.message)}</div>`;
    }
  }); });
}

views.list = async (_p, lid) => {
  const l = await api("GET", `/api/lists/${lid}`);
  const meta2 = state.lists.find((x) => x.id === lid);
  const fields = [...new Set(l.contacts.flatMap((c) => Object.keys(c)))].filter((f) => f !== "user_id").slice(0, 7);
  view.innerHTML = `<div class="page-head"><div><a href="#/audience" class="small">Audience</a><h1 style="margin-top:4px">${esc(l.name)}</h1>
    <p>${plural(l.contacts.length, "person", "people")}${meta2?.source ? `, from ${esc(meta2.source)}. Updated ${when(meta2.refreshedAt)}.` : ", uploaded."}</p></div>
    <div class="row">${meta2?.source ? `<button class="btn" id="rf">Refresh</button>` : ""}<button class="btn primary" id="use">Send an email to this list</button></div></div>
  <div class="panel flush"><div class="table-wrap"><table><thead><tr>${fields.map((f) => `<th>${esc(f.replace(/_/g, " "))}</th>`).join("")}<th></th></tr></thead><tbody>
    ${l.contacts.slice(0, 300).map((c) => `<tr>${fields.map((f) => `<td class="small">${esc(c[f] ?? "")}</td>`).join("")}<td class="r"><button class="btn quiet sm" data-rm="${esc(c.email)}" aria-label="Remove ${esc(c.email)}">Remove</button></td></tr>`).join("")}
  </tbody></table>${l.contacts.length > 300 ? `<p class="small muted" style="padding:12px 16px">Showing 300 of ${int(l.contacts.length)}.</p>` : ""}</div></div>
  <details class="panel" style="margin-top:20px"><summary>Add people from a spreadsheet</summary>
    <form class="form" id="add" style="margin-top:12px"><textarea name="csv" placeholder="email,first_name"></textarea><div><button class="btn">Add</button></div></form></details>
  <div style="margin-top:20px"><button class="btn quiet danger" id="dl">Delete list</button></div>`;

  view.querySelector("#use").addEventListener("click", () => {
    const brand = meta2?.db ?? store("brand") ?? "nursia";
    draft = { ...freshDraft(brand), listIds: [lid] };
    location.hash = "#/new?keep";
  });
  view.querySelector("#rf")?.addEventListener("click", (e) => guard(async () => {
    e.target.disabled = true;
    try {
      const r = await api("POST", `/api/lists/${lid}/refresh`);
      toast(`${plural(r.count, "person", "people")} now; ${int(r.joined)} joined, ${int(r.left)} left`);
      await refresh(); views.list(null, lid);
    } finally { e.target.disabled = false; }
  }));
  view.querySelector("#add").addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
    const r = await api("POST", `/api/lists/${lid}/contacts`, { csv: e.target.csv.value });
    toast(`${int(r.added)} added, ${int(r.updated)} updated`);
    await refresh(); views.list(null, lid);
  }); });
  view.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => guard(async () => { await api("DELETE", `/api/lists/${lid}/contacts/${encodeURIComponent(b.dataset.rm)}`); views.list(null, lid); })));
  view.querySelector("#dl").addEventListener("click", () => guard(async () => {
    if (!(await ask({ title: `Delete "${esc(l.name)}"?`, body: "Emails already sent to it keep their results.", confirm: "Delete list" }))) return;
    await api("DELETE", `/api/lists/${lid}`); await refresh(); location.hash = "#/audience";
  }));
};

/* ── templates ────────────────────────────────────────────────────────── */

let tplBrand = store("tplBrand") ?? "nursia";

views.templates = async (params, sub, tid) => {
  if (sub === "new" || sub === "edit") return templateForm(sub === "edit" ? tid : null, params);
  const all = await api("GET", "/api/templates");
  if (!location.hash.startsWith("#/templates")) return;
  const mine = all.filter((t) => t.brand === tplBrand);
  const uploaded = mine.filter((t) => t.custom && !t.custom.archived);
  const archived = mine.filter((t) => t.custom?.archived);
  const groups = {};
  for (const t of mine.filter((x) => !x.custom)) (groups[t.group] ||= []).push(t);

  const card = (t) => `<article class="tpl lib">
    <a class="thumb" href="/api/templates/${t.id}/preview" target="_blank" rel="noopener" aria-label="Open ${esc(t.name)} full size"><iframe loading="lazy" src="/api/templates/${t.id}/preview" title="" tabindex="-1" aria-hidden="true"></iframe></a>
    <div class="meta"><h3>${esc(t.name)}</h3><p>${esc(t.purpose || t.subject)}</p>
      ${t.custom ? `<p class="small muted">Updated ${when(t.custom.updatedAt)}${t.custom.createdBy ? ` by ${esc(t.custom.createdBy)}` : ""}${t.custom.footer ? ". Standard footer added" : ""}</p>` : ""}</div>
    <div class="acts">
      ${t.custom?.archived ? `<button class="btn sm" data-restore="${t.id}">Restore</button><button class="btn quiet sm danger" data-del="${t.id}">Delete</button>`
        : `<a class="btn primary sm" href="#/new?template=${t.id}">Use</a>
      ${t.custom ? `<a class="btn sm" href="#/templates/edit/${t.id}">Edit</a>` : ""}
      <a class="btn quiet sm" href="/api/templates/${t.id}/source" download>Download HTML</a>
      ${t.custom ? `<button class="btn quiet sm" data-archive="${t.id}">Archive</button>` : ""}`}
    </div></article>`;

  view.innerHTML = `<div class="page-head"><div><h1>Templates</h1><p>The emails you can send. Upload your own HTML, or download a built-in one, change it and upload your copy.</p></div>
    <div class="row"><div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button data-tb="${k}" class="${tplBrand === k ? "on" : ""}">${v}</button>`).join("")}</div>
    <a class="btn primary" href="#/templates/new?brand=${tplBrand}">Upload template</a></div></div>

  <div class="tpl-group"><h2>Uploaded</h2>
    ${uploaded.length ? `<div class="tpl-grid">${uploaded.map(card).join("")}</div>`
      : `<div class="panel empty"><h2>No uploaded ${BRANDS[tplBrand]} templates yet</h2><p>Upload an HTML email from any editor. Merge tags like {{ first_name }} fill in per person, and an unsubscribe footer is added if it doesn't have one.</p><a class="btn primary" href="#/templates/new?brand=${tplBrand}">Upload template</a></div>`}</div>
  ${Object.entries(groups).map(([g, ts]) => `<div class="tpl-group"><h2>${esc(g)} <span class="muted small">Built in</span></h2><div class="tpl-grid">${ts.map(card).join("")}</div></div>`).join("")}
  ${archived.length ? `<details class="panel" style="margin-top:30px"><summary>Archived (${archived.length})</summary><p class="small muted" style="margin:10px 0 16px">Hidden from new emails. Emails already sent with them keep working.</p><div class="tpl-grid">${archived.map(card).join("")}</div></details>` : ""}`;

  view.querySelectorAll("[data-tb]").forEach((b) => b.addEventListener("click", () => { tplBrand = b.dataset.tb; store("tplBrand", tplBrand); views.templates(new URLSearchParams()); }));
  const flip = (sel, archivedNow, msg) => view.querySelectorAll(sel).forEach((b) => b.addEventListener("click", () => guard(async () => {
    await api("PUT", `/api/templates/${b.dataset[archivedNow ? "archive" : "restore"]}`, { archived: archivedNow });
    toast(msg);
    await refresh();
    views.templates(new URLSearchParams());
  })));
  flip("[data-archive]", true, "Archived");
  flip("[data-restore]", false, "Restored");
  view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    if (!(await ask({ title: "Delete this template?", body: "Its HTML and images are removed for good. This can't be undone.", confirm: "Delete template" }))) return;
    await api("DELETE", `/api/templates/${b.dataset.del}`);
    toast("Template deleted");
    await refresh();
    views.templates(new URLSearchParams());
  })));
};

const MERGE_TAGS = [
  ["{{ first_name }}", "Their first name, if the list has it"],
  ["{{ email }}", "Their address"],
  ['{{ first_name | default: "there" }}', "A fallback when it's blank"],
  ["{{ unsubscribe_url }}", "Their one-click unsubscribe link"],
  ["{{ postal_address }}", "The brand's postal address"],
  ["{{ continue_url }}", "Back to the app, tagged for analytics"],
  ["{{ invite_url }}", "A share link for friends"],
];

const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
  r.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
  r.readAsDataURL(file);
});

async function templateForm(tid, params) {
  const existing = tid ? (await api("GET", "/api/templates")).find((t) => t.id === tid) : null;
  if (tid && !existing) { view.innerHTML = `<div class="empty"><h2>That template is gone</h2><a class="btn" href="#/templates">Back to templates</a></div>`; return; }
  const html0 = tid ? await fetch(`/api/templates/${tid}/source`).then((r) => r.text()) : "";
  const f = {
    brand: existing?.brand ?? params.get("brand") ?? tplBrand,
    name: existing?.name ?? "",
    subject: existing?.subject ?? "",
    purpose: existing?.purpose ?? "",
    html: html0,
  };
  const added = {};
  const removed = new Set();
  const kept = () => (existing?.custom?.images ?? []).filter((n) => !removed.has(n));

  view.innerHTML = `<div class="page-head"><div><a href="#/templates" class="small">Templates</a><h1 style="margin-top:4px">${existing ? `Edit "${esc(existing.name)}"` : "Upload a template"}</h1>
    <p>An HTML email from any editor (Stripo, Beefree, Figma export, hand-written). It's checked and previewed before anything is saved.</p></div></div>
  <div class="compose">
    <div class="form">
      <div class="panel flush preview">
        <div class="preview-bar"><span class="small muted" id="pvAs">Preview</span>
          <div class="seg" role="group" aria-label="Preview size"><button class="on" data-w="100%">Desktop</button><button data-w="390px">Phone</button></div></div>
        <div class="preview-frame"><iframe id="pv" title="Template preview"></iframe></div>
      </div>
    </div>
    <aside class="side-panel">
      <form class="panel form" id="tf">
        <div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button type="button" data-fb="${k}" class="${f.brand === k ? "on" : ""}">${v}</button>`).join("")}</div>
        <label>Name<input name="name" value="${esc(f.name)}" required placeholder="For example: October webinar invite"></label>
        <label>Default subject<input name="subject" value="${esc(f.subject)}" required placeholder="You're invited, {{ first_name }}"><span class="hint">Can be changed per email.</span></label>
        <label>What it's for<input name="purpose" value="${esc(f.purpose)}" placeholder="One line, shown on the template card"></label>
        <label>HTML file<input type="file" id="htmlFile" accept=".html,.htm,text/html"><span class="hint" id="htmlState">${f.html ? `Current HTML kept (${int(f.html.length)} characters) unless you choose a new file.` : "Choose a file, or paste below."}</span></label>
        <details ${f.html || !existing ? "" : "open"}><summary>${existing ? "Edit the HTML" : "Or paste the HTML"}</summary>
          <textarea id="htmlText" spellcheck="false" style="margin-top:10px;min-height:220px;font-family:ui-monospace,Consolas,monospace" placeholder="<!doctype html>…">${esc(f.html)}</textarea></details>
        <label>Images<input type="file" id="imgFiles" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" multiple>
          <span class="hint">Any image the HTML points at with a relative path, like images/hero.png. They're sent inside the email, so nothing needs hosting. 3 MB in total.</span></label>
        <ul class="files" id="imgList"></ul>
        <details><summary>Merge tags you can use</summary>
          <dl class="tags">${MERGE_TAGS.map(([k, v]) => `<div><dt><code>${esc(k)}</code></dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          <p class="small muted">Any other column on the list works too, like {{ exam }}. Use {% if field %}…{% endif %} to skip a sentence when it's blank.</p></details>
      </form>
      <div class="panel form">
        <h2>Checks</h2>
        <ul class="checks" id="tchecks"><li class="muted">Add the HTML to check it.</li></ul>
        <button class="btn primary big" id="saveT">${existing ? "Save changes" : "Save template"}</button>
        ${existing ? `<a class="btn quiet sm" href="#/templates">Cancel</a>` : ""}
      </div>
    </aside></div>`;

  const $ = (sel) => view.querySelector(sel);
  const form = $("#tf");
  /* form.name would be the form's own name attribute, so fields are looked up by name instead. */
  const field = (n) => form.querySelector(`[name=${n}]`);
  const pv = $("#pv");

  const renderFiles = () => {
    const rows = [
      ...kept().map((n) => `<li><code>${esc(n)}</code><span class="muted small">saved</span><button type="button" class="btn quiet sm" data-rmimg="${esc(n)}">Remove</button></li>`),
      ...Object.keys(added).map((n) => `<li><code>${esc(n)}</code><span class="chip ok">new</span><button type="button" class="btn quiet sm" data-rmnew="${esc(n)}">Remove</button></li>`),
    ];
    $("#imgList").innerHTML = rows.join("");
    $("#imgList").hidden = !rows.length;
    $("#imgList").querySelectorAll("[data-rmimg]").forEach((b) => b.addEventListener("click", () => { removed.add(b.dataset.rmimg); renderFiles(); preview(); }));
    $("#imgList").querySelectorAll("[data-rmnew]").forEach((b) => b.addEventListener("click", () => { delete added[b.dataset.rmnew]; renderFiles(); preview(); }));
  };

  const payload = () => {
    f.name = field("name").value;
    f.subject = field("subject").value;
    f.purpose = field("purpose").value;
    f.html = $("#htmlText").value;
    return { id: existing?.id, brand: f.brand, name: f.name, subject: f.subject, purpose: f.purpose, html: f.html, assets: added, removeAssets: [...removed] };
  };

  let pvTimer, seq = 0, lastOk = false;
  const preview = () => {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(async () => {
      const body = payload();
      if (!body.html.trim()) { lastOk = false; return; }
      const mine = ++seq;
      try {
        const r = await api("POST", "/api/templates/draft-preview", { ...body, name: body.name || "Draft", subject: body.subject || "(no subject)" });
        if (mine !== seq) return;
        lastOk = true;
        pv.srcdoc = r.html.replace(/<head>/i, '<head><base target="_blank">');
        $("#pvAs").innerHTML = `<b>${esc(r.subject)}</b><br>as asha@example.com would see it`;
        const notes = r.notes.length ? r.notes : [{ level: "ok", text: "Looks ready to send." }];
        $("#tchecks").innerHTML = notes.map((x) => `<li class="${x.level}"><span class="i">${x.level === "ok" ? "✓" : "!"}</span><span>${esc(x.text)}</span></li>`).join("");
      } catch (e) {
        if (mine !== seq) return;
        lastOk = false;
        $("#tchecks").innerHTML = `<li class="block"><span class="i">✕</span><span>${esc(e.message)}</span></li>`;
      }
    }, 350);
  };

  view.querySelectorAll("[data-fb]").forEach((b) => b.addEventListener("click", () => {
    f.brand = b.dataset.fb;
    view.querySelectorAll("[data-fb]").forEach((x) => x.classList.toggle("on", x === b));
    preview();
  }));
  view.querySelectorAll(".seg [data-w]").forEach((b) => b.addEventListener("click", () => {
    view.querySelectorAll(".seg [data-w]").forEach((x) => x.classList.toggle("on", x === b));
    pv.style.width = b.dataset.w;
  }));
  $("#htmlFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("#htmlText").value = await file.text();
    $("#htmlState").textContent = `${file.name}, ${int(file.size)} bytes. You can tweak it under "${existing ? "Edit the HTML" : "Or paste the HTML"}".`;
    if (!field("name").value) field("name").value = file.name.replace(/\.html?$/i, "").replace(/[-_]+/g, " ");
    const title = $("#htmlText").value.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    if (!field("subject").value && title) field("subject").value = title;
    preview();
  });
  $("#imgFiles").addEventListener("change", (e) => guard(async () => {
    for (const file of e.target.files) {
      added[file.name] = { mime: file.type || "image/png", base64: await readAsBase64(file) };
      removed.delete(file.name);
    }
    e.target.value = "";
    renderFiles();
    preview();
  }));
  form.addEventListener("input", (e) => { if (e.target.id !== "htmlFile" && e.target.id !== "imgFiles") preview(); });
  form.addEventListener("submit", (e) => e.preventDefault());

  $("#saveT").addEventListener("click", (e) => guard(async () => {
    const body = payload();
    if (!body.name.trim() || !body.subject.trim()) throw new Error("Give it a name and a default subject");
    e.target.disabled = true;
    try {
      const r = existing ? await api("PUT", `/api/templates/${existing.id}`, body) : await api("POST", "/api/templates", body);
      const warns = r.notes.filter((x) => x.level === "warn").length;
      toast(`${existing ? "Saved" : "Template saved"}${warns ? `, with ${plural(warns, "thing")} to look at` : ""}`);
      tplBrand = f.brand;
      store("tplBrand", tplBrand);
      await refresh();
      location.hash = "#/templates";
    } finally { e.target.disabled = false; }
  }));

  renderFiles();
  if (f.html) preview();
}

/* ── mailboxes (shown in Settings) ── */

/** A small form in a dialog. Resolves to the values, or null if cancelled. */
function formDialog({ title, body = "", fields, confirm = "Save" }) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form method="dialog" class="form" style="gap:14px"><h2>${title}</h2>${body ? `<p>${body}</p>` : ""}
      ${fields.map((x) => x.type === "checkbox"
        ? `<label class="check"><input type="checkbox" name="${x.name}" ${x.value ? "checked" : ""}> ${x.label}</label>`
        : `<label>${x.label}<input name="${x.name}" value="${esc(x.value ?? "")}" placeholder="${esc(x.placeholder ?? "")}" ${x.type ? `type="${x.type}"` : ""} ${x.required ? "required" : ""}>${x.hint ? `<span class="hint">${x.hint}</span>` : ""}</label>`).join("")}
      <div class="acts"><button class="btn" value="" formnovalidate>Cancel</button><button class="btn primary" value="ok">${confirm}</button></div></form>`;
    document.body.append(d);
    d.addEventListener("close", () => {
      const ok = d.returnValue === "ok";
      const out = {};
      if (ok) for (const x of fields) { const i = d.querySelector(`[name=${x.name}]`); out[x.name] = x.type === "checkbox" ? i.checked : i.value.trim(); }
      d.remove();
      resolve(ok ? out : null);
    });
    d.showModal();
  });
}

async function renderMailboxes(brand) {
  const box = document.getElementById("mailboxes");
  if (!box) return;
  const mine = mailboxesOf(brand);
  const domains = await api("GET", "/api/domains").then((ds) => ds.filter((d) => d.status === "verified" || d.status === "partially_failed").map((d) => d.name)).catch(() => []);
  if (!document.body.contains(box)) return;
  box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Sends as</th><th>Replies go to</th><th></th></tr></thead><tbody>
    ${mine.map((m) => `<tr><td><b>${esc(m.name)}</b> ${m.isDefault ? `<span class="chip stamp">Default</span>` : ""}<span class="sub">${esc(m.email)}</span></td>
      <td class="small">${esc(m.replyTo || m.email)}</td>
      <td class="r"><div class="row" style="justify-content:flex-end;gap:4px">
        <button class="btn quiet sm" data-mtest="${m.id}">Send test</button>
        <button class="btn quiet sm" data-medit="${m.id}">Edit</button>
        ${m.isDefault ? "" : `<button class="btn quiet sm" data-mdef="${m.id}">Make default</button><button class="btn quiet sm danger" data-mdel="${m.id}">Remove</button>`}
      </div></td></tr>`).join("")}
    </tbody></table></div>
    <div class="row" style="justify-content:space-between;padding:14px 18px;border-top:1px solid var(--line)">
      <p class="small muted">New emails start from the default; automatic emails always use it.${domains.length ? ` Addresses must be on ${domains.map(esc).join(", ")}.` : ""}</p>
      <button class="btn primary sm" id="addMbx">Add mailbox</button></div>`;

  const fields = (m = {}) => [
    { name: "name", label: "Sender name", value: m.name ?? BRANDS[brand], placeholder: `Asha from ${BRANDS[brand]}`, required: true, hint: "What people see in their inbox." },
    { name: "email", label: "Sending address", value: m.email ?? "", type: "email", placeholder: `hello@${domains.find((d) => d.includes(brand === "nursia" ? "nursia" : "prepclever")) ?? "example.com"}`, required: true },
    { name: "replyTo", label: "Replies go to", value: m.replyTo ?? "", type: "email", placeholder: "Same as the sending address", hint: "Use a mailbox someone reads." },
    ...(m.id ? [] : [{ name: "isDefault", label: "Make this the default", type: "checkbox", value: !mine.length }]),
  ];
  const reload = async (msg) => { toast(msg); await refresh(); renderMailboxes(brand); };

  box.querySelector("#addMbx").addEventListener("click", () => guard(async () => {
    const v = await formDialog({ title: `Add a ${BRANDS[brand]} mailbox`, fields: fields(), confirm: "Add mailbox" });
    if (!v) return;
    await api("POST", "/api/mailboxes", { brand, ...v });
    await reload(`Added ${v.email}`);
  }));
  box.querySelectorAll("[data-medit]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    const m = mine.find((x) => x.id === b.dataset.medit);
    const v = await formDialog({ title: "Edit mailbox", fields: fields(m) });
    if (!v) return;
    await api("PUT", `/api/mailboxes/${m.id}`, v);
    await reload("Mailbox saved");
  })));
  box.querySelectorAll("[data-mdef]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    await api("PUT", `/api/mailboxes/${b.dataset.mdef}`, { isDefault: true });
    await reload("Default mailbox changed");
  })));
  box.querySelectorAll("[data-mdel]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    const m = mine.find((x) => x.id === b.dataset.mdel);
    if (!(await ask({ title: `Remove ${esc(m.email)}?`, body: "Emails already sent from it keep their results. Drafts using it will need a new From.", confirm: "Remove" }))) return;
    await api("DELETE", `/api/mailboxes/${m.id}`);
    await reload("Mailbox removed");
  })));
  box.querySelectorAll("[data-mtest]").forEach((b) => b.addEventListener("click", () => guard(async () => {
    const to = await ask({ title: "Send a test from this mailbox", body: "A short plain note, to check it reaches the inbox and how the sender shows.", confirm: "Send test", input: { label: "Send to", value: store("testTo") ?? me ?? "", type: "email" } });
    if (!to) return;
    store("testTo", to);
    await api("POST", `/api/mailboxes/${b.dataset.mtest}/test`, { to });
    toast(`Test sent to ${to}`);
  })));
}

/* ── settings ─────────────────────────────────────────────────────────── */

let settingsBrand = "nursia";

views.settings = async () => {
  const s = state.settings;
  const b = s.brands[settingsBrand];
  view.innerHTML = `<div class="page-head"><div><h1>Settings</h1><p>Who your emails come from, what their footers say, and how results are tracked.</p></div>
    <div class="seg" role="group" aria-label="Brand">${Object.entries(BRANDS).map(([k, v]) => `<button data-sb="${k}" class="${settingsBrand === k ? "on" : ""}">${v}</button>`).join("")}</div></div>

  <section><div class="section-head"><h2>${BRANDS[settingsBrand]} mailboxes</h2></div>
    <div class="panel flush" id="mailboxes"><p class="muted" style="padding:18px">Loading mailboxes…</p></div></section>

  <section><div class="section-head"><h2>${BRANDS[settingsBrand]} details</h2></div>
    <form class="panel form" id="sf">
      <label>Website<input name="website" value="${esc(b.website)}"><span class="hint">Where "continue" and invite links in emails go.</span></label>
      <label>Postal address<input name="postalAddress" value="${esc(b.postalAddress)}" placeholder="Area, city, postcode, country"><span class="hint">Printed in every footer. Marketing email must show one (CAN-SPAM); automatic emails pause while it's empty.</span></label>
      <details><summary>Links in emails</summary><div class="form" style="margin-top:14px">
        <label>Instagram<input name="instagramUrl" value="${esc(b.instagramUrl)}" placeholder="https://www.instagram.com/…"></label>
        <div class="pair"><label>Google Play<input name="playStoreUrl" value="${esc(b.playStoreUrl)}" placeholder="https://play.google.com/store/apps/details?id=…"></label>
        <label>App Store<input name="appStoreUrl" value="${esc(b.appStoreUrl)}" placeholder="https://apps.apple.com/app/…"></label></div>
        <span class="hint">The "Get the app" buttons only appear in emails once a link is here.</span></div></details>
      <div><button class="btn primary">Save ${BRANDS[settingsBrand]} details</button></div>
    </form></section>

  <section><div class="section-head"><h2>Open and click tracking</h2></div>
    <div class="panel" id="domains"><p class="muted">Loading domains…</p></div></section>

  <section><div class="section-head"><h2>Live results and automation</h2></div>
    <div class="panel form" id="setup"><p class="muted">Checking…</p></div></section>`;

  view.querySelectorAll("[data-sb]").forEach((x) => x.addEventListener("click", () => { settingsBrand = x.dataset.sb; views.settings(); }));
  view.querySelector("#sf").addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
    await api("PUT", "/api/settings", { brands: { [settingsBrand]: Object.fromEntries(new FormData(e.target)) } });
    await refresh(); toast(`Saved ${BRANDS[settingsBrand]} details`);
  }); });
  renderMailboxes(settingsBrand);
  renderSetup();
  renderDomains();
};

async function renderSetup() {
  const box = document.getElementById("setup");
  const st = await api("GET", "/api/setup").catch((e) => ({ error: e.message }));
  if (!box || !document.body.contains(box)) return;
  if (st.error) { box.innerHTML = `<div class="notice block">${esc(st.error)}</div>`; return; }
  box.innerHTML = `
    <div class="toggle-row"><div><h3>Live results</h3><p class="small muted">${st.liveResults ? "Connected. Opens, clicks and bounces arrive the moment they happen." : st.hosted ? "Not connected. Results only update when you press Refresh." : "Only available once Mailroom is online; Resend can't reach this laptop."}</p></div>
      ${st.liveResults ? '<span class="chip ok">Connected</span>' : `<button class="btn sm primary" id="hook" ${st.hosted ? "" : "disabled"}>Connect</button>`}</div>
    <div class="toggle-row"><div><h3>5-minute check</h3><p class="small muted">${st.schedule ? `Running (${esc(st.schedule.cron)}). Picks up new sign-ups and sends what's due.` : st.hosted ? "Not scheduled yet. Run npm run schedule once after deploying." : "Runs once Mailroom is online."}</p></div>
      ${st.schedule ? '<span class="chip ok">Running</span>' : '<span class="chip">Off</span>'}</div>
    <p class="small muted">Unsubscribe and answer links use this address: <code>${esc(st.base)}</code></p>`;
  box.querySelector("#hook")?.addEventListener("click", (e) => guard(async () => {
    e.target.disabled = true;
    await api("POST", "/api/setup/webhook");
    toast("Live results connected");
    renderSetup();
  }));
}

async function renderDomains() {
  const box = document.getElementById("domains");
  const domains = await api("GET", "/api/domains").catch((e) => { box.innerHTML = `<div class="notice block">${esc(e.message)}</div>`; return null; });
  if (!domains || !document.body.contains(box)) return;
  const senders = {};
  for (const m of state.mailboxes ?? []) {
    const host = m.email.split("@")[1]?.toLowerCase();
    if (host && !(senders[host] ||= []).includes(BRANDS[m.brand])) senders[host].push(BRANDS[m.brand]);
  }
  const ordered = [...domains.filter((d) => senders[d.name]), ...domains.filter((d) => !senders[d.name])];
  const health = { verified: ["ok", "Verified"], partially_failed: ["wait", "Sending works, inbound mail failing"], pending: ["wait", "Waiting for DNS"], failed: ["bad", "DNS failing"] };

  const setup = (d) => {
    if (d.trackingReady) return "";
    if (!d.trackingSubdomain && !d.trackingRecords.length) return `<div class="setup">
      <div class="setup-step"><span class="n">1</span><div><b>Create a tracking address.</b> Resend counts opens and clicks through it and won't switch tracking on without one.
        <form class="row tsub" data-d="${d.id}" style="margin-top:10px"><span class="sub-input"><input name="subdomain" value="links" aria-label="Tracking subdomain"><span>.${esc(d.name)}</span></span><button class="btn sm primary">Create</button></form>
        <p class="small muted" style="margin-top:6px">You can rename it later but never remove it, so old tracked links keep working.</p></div></div>
      <div class="setup-step dim"><span class="n">2</span><div><b>Add the DNS record it gives you</b>, then check it here.</div></div></div>`;
    return `<div class="setup">
      <div class="setup-step done"><span class="n">✓</span><div>Tracking address <b>${esc(d.trackingSubdomain ?? d.trackingRecords[0]?.name ?? "")}</b> created.</div></div>
      <div class="setup-step"><span class="n">2</span><div><b>Add this record where ${esc(d.name.split(".").slice(-2).join("."))}'s DNS is managed</b>, then check.
        <div class="table-wrap" style="margin:10px 0"><table><thead><tr><th>Type</th><th>Name</th><th>Value</th><th>Status</th></tr></thead><tbody>
        ${d.trackingRecords.map((r) => `<tr><td><b>${esc(r.type)}</b></td><td><code>${esc(r.name)}</code> <button class="btn quiet sm copy" data-copy="${esc(r.name)}">Copy</button></td><td><code>${esc(r.value)}</code> <button class="btn quiet sm copy" data-copy="${esc(r.value)}">Copy</button></td><td><span class="chip ${r.status === "verified" ? "ok" : r.status === "failed" ? "bad" : "wait"}">${esc(r.status.replace("_", " "))}</span></td></tr>`).join("") || `<tr><td colspan="4" class="muted">Resend hasn't listed the record yet. Check again in a few seconds.</td></tr>`}
        </tbody></table></div>
        <button class="btn sm primary verify" data-d="${d.id}">Check DNS</button>
        <p class="small muted" style="margin-top:6px">On Cloudflare, set it to DNS only (grey cloud). It can take up to an hour.</p></div></div></div>`;
  };
  const sw = (d, k, on, title) => `<div class="track ${on ? "on" : "off"}"><div><h3>${title}</h3><div class="state">${on ? "On" : d.trackingReady ? "Off" : "Off until step 2 is done"}</div></div>
    <button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${title} for ${esc(d.name)}" data-d="${d.id}" data-k="${k}" ${d.trackingReady ? "" : "disabled"}><span></span></button></div>`;

  box.innerHTML = ordered.map((d) => {
    const [tone, label] = health[d.status] ?? ["wait", d.status];
    return `<div class="domain ${senders[d.name] ? "" : "unused"}">
      <div class="domain-head"><div><h3>${esc(d.name)}</h3><p class="small muted">${senders[d.name] ? `${senders[d.name].join(" and ")} emails send from here` : "No emails here send from this domain"}</p></div><span class="chip ${tone}">${label}</span></div>
      ${setup(d)}
      <div class="tracks">${sw(d, "open", d.open_tracking, "Open tracking")}${sw(d, "click", d.click_tracking, "Click tracking")}</div></div>`;
  }).join("");

  box.querySelectorAll(".switch").forEach((btn) => btn.addEventListener("click", () => guard(async () => {
    const d = domains.find((x) => x.id === btn.dataset.d);
    const next = { open: d.open_tracking, click: d.click_tracking };
    next[btn.dataset.k] = !next[btn.dataset.k];
    btn.disabled = true;
    try {
      await api("POST", `/api/domains/${d.id}/tracking`, next);
      toast(`${btn.dataset.k === "open" ? "Open" : "Click"} tracking ${next[btn.dataset.k] ? "on" : "off"} for ${d.name}`);
    } finally { renderDomains(); }
  })));
  box.querySelectorAll(".tsub").forEach((form) => form.addEventListener("submit", (e) => { e.preventDefault(); guard(async () => {
    const d = domains.find((x) => x.id === form.dataset.d);
    const sub = form.subdomain.value.trim();
    if (!(await ask({ title: `Create ${esc(sub)}.${esc(d.name)}?`, body: "You can rename it later, but Resend never lets you remove it.", confirm: "Create" }))) return;
    await api("POST", `/api/domains/${d.id}/tracking-subdomain`, { subdomain: sub });
    toast("Created. Now add the DNS record.");
    renderDomains();
  }); }));
  box.querySelectorAll(".verify").forEach((b) => b.addEventListener("click", () => guard(async () => {
    b.disabled = true; b.textContent = "Checking…";
    try {
      const d = await api("POST", `/api/domains/${b.dataset.d}/verify`);
      toast(d.trackingReady ? `${d.name} is verified. Tracking can go on now.` : `${d.name} isn't verified yet. DNS can take a while; check again in a few minutes.`, !d.trackingReady);
    } finally { renderDomains(); }
  })));
  box.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast("Copied"); } catch { toast("Couldn't copy. Select it by hand.", true); }
  }));
}

/* ── router ───────────────────────────────────────────────────────────── */

async function route() {
  clearTimeout(poll);
  clearTimeout(flowPoll);
  const [path, query] = location.hash.slice(1).split("?");
  const [, name = "", arg, arg2] = (path || "/").split("/");
  const key = name || "home";
  const nav = { email: "emails", new: "emails", list: "audience", user: "users", template: "templates" }[key] ?? key;
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const on = a.dataset.nav === nav;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (key !== "new" && key !== "email") draft = key === "list" ? draft : null;
  await guard(async () => {
    await refresh();
    const params = new URLSearchParams(query);
    if (key === "new" && params.has("keep") && draft) return renderComposer();
    await (views[key] ?? views.home)(params, arg, arg2);
  });
  view.focus({ preventScroll: true });
}

document.getElementById("syncBtn").addEventListener("click", (e) => guard(async () => {
  e.target.disabled = true;
  e.target.textContent = "Refreshing…";
  try {
    const r = await api("POST", "/api/sync");
    toast(`Results refreshed for ${plural(r.updated, "email")}`);
    await route();
  } finally {
    e.target.disabled = false;
    e.target.textContent = "Refresh results";
  }
}));

addEventListener("hashchange", route);
route();
