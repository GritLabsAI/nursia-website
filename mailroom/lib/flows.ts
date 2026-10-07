import {
  addEnrollments, flowSendsToday, getEnrollments, templateHistory, getFlowState, getSettings, id, saveCampaign, saveFlowState, saveList,
  suppressedSet, sql, statsFor, type Campaign, type Enrollment, type FlowState,
} from "./db";
import { fields, snapshot, undeliverable, type Extra, type Snapshot, type User } from "./audiences";
import { sendTest, settingsWithSecret, startCampaign } from "./campaigns";
import { blocksAutomatic, senderChecks } from "./checks";
import { getTemplate } from "./templates";
import { prepcleverQuizExams } from "./quiz";
import { Liquid } from "liquidjs";

/* Subjects on the automations page read as a sample person would see them, not as merge tags. */
const liquid = new Liquid({ strictVariables: false });
const sampleSubject = (subject: string | undefined, sample: Record<string, string> = {}) =>
  subject ? liquid.parseAndRender(subject, { first_name: "Asha", exam: "NCLEX-RN", exam_short: "NCLEX", plan_name: "1 month", ...sample }).catch(() => subject) : Promise.resolve("");

/**
 * Automatic emails after onboarding, for both apps.
 *
 * Every 5 minutes (QStash calls /api/cron/tick) Mailroom reads who has
 * finished onboarding. Anyone it hasn't seen before is enrolled, stamped with
 * the time it first saw them; the welcome goes 15 minutes after that. The apps
 * don't record when onboarding finished, so this is 15–20 minutes after, not
 * to the second.
 *
 * The first time a flow looks, everyone already onboarded is enrolled as
 * "baseline" and never welcomed — switching this on mustn't mail the whole
 * user base a welcome.
 *
 * Nursia then follows the onboarding sequence from
 * internal/email/onboarding/README.md, keyed off when the welcome went:
 * nudge if they haven't practised in 24h, "your numbers" once they have,
 * win-back if they go quiet, and the conversion email at the end. Each step is
 * re-checked against their current state every time, and nobody gets one twice.
 */

const H = 3600_000;
const D = 24 * H;
const FREE_QUESTIONS = 50;

type Param = { key: string; label: string; default: string };
type Ctx = {
  now: number; firstSeen: number; sent: (step: string) => number | null; answered: number; practised: boolean; p: Record<string, string>;
  /** Their latest unpaid checkout, for flows that read commerce; null if none or since paid. */
  checkout: { at: number; cart: string } | null;
  /** When they last got this template from any campaign or automation (flows that list it in `history`). */
  history: (template: string) => number | null;
  /** OSes PostHog saw them on, and whether they use the Android app (flows that need "os" / "devices"). */
  os: string[];
  hasApp: boolean;
  /** How likely they are to act: checkout, paywall, recent use, practice, onboarding, exam date. */
  intent: number;
};

export type StepDef = {
  id: string; template: string; title: string; rule: string; wait: string; params: Param[]; due: (u: User, c: Ctx) => boolean;
  /** With a `perDay` param: who goes first when more are due than the day allows. Higher first. */
  rank?: (u: User, c: Ctx) => number;
};
export type FlowDef = {
  id: string; name: string; db: "nursia" | "prepclever"; description: string; steps: StepDef[];
  /** A recurring flow for everyone onboarded: people already there count, and so do paying members. */
  everyone?: boolean;
  /** Enrol every account with an email, onboarded or not. */
  allUsers?: boolean;
  /** Extra app data the steps read. */
  needs?: Extra[];
  /** Templates whose send history (from any campaign) the steps check, so nobody gets one twice. */
  history?: string[];
};

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const freeLeft = (c: Ctx) => Math.max(0, FREE_QUESTIONS - c.answered);
const active = (c: Ctx) => c.answered > 0 || c.practised;

const welcome = (template: string): StepDef => ({
  id: "welcome",
  template,
  title: "Welcome",
  wait: "{minutes} minutes after they finish onboarding",
  rule: "Finished onboarding at least {minutes} minutes ago (and in the last 3 days), and hasn't had the welcome.",
  params: [{ key: "minutes", label: "Minutes after onboarding", default: "15" }],
  due: (_u, c) => !c.sent("welcome") && c.firstSeen <= c.now - num(c.p.minutes, 15) * 60_000 && c.firstSeen > c.now - 3 * D,
});

/* India time: 09:00 IST is 03:30 UTC, the same UTC date, so the day's quiz set matches. */
const IST = 5.5 * H;
const istDay = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
const istHour = (ms: number) => new Date(ms + IST).getUTCHours();

const daily = (brand: "nursia" | "prepclever"): StepDef => ({
  id: "daily",
  template: `${brand}-daily-question`,
  title: "Daily questions",
  wait: "Every day from {hour}:00 India time",
  rule: "Used the app in the last {days} days and hasn't had today's set. Answers are marked as they click, and the score with every answer explained comes by email when they finish.",
  params: [{ key: "hour", label: "Send from (hour, India time)", default: "9" }, { key: "days", label: "Used the app in the last N days", default: "14" }],
  due: (u, c) => {
    const last = c.sent("daily");
    if (last && istDay(last) === istDay(c.now)) return false;
    if (istHour(c.now) < num(c.p.hour, 9)) return false;
    return !!u.last_seen_at && Date.parse(u.last_seen_at) > c.now - num(c.p.days, 14) * D;
  },
});

/* A friendly evening nudge, once a day, to everyone. */
const reminder: StepDef = {
  id: "reminder",
  template: "nursia-daily-reminder",
  title: "Daily reminder",
  wait: "Every day from {hour}:00 India time, starting {startOn}",
  rule: "Once a day to every account. Skip people who used the app today: {skipToday}.",
  params: [
    { key: "hour", label: "Send from (hour, India time)", default: "18" },
    { key: "skipToday", label: "Skip people who used the app today (yes/no)", default: "no" },
    { key: "startOn", label: "First day to send (YYYY-MM-DD, India time)", default: "2026-10-08" },
  ],
  due: (u, c) => {
    if (c.p.startOn && istDay(c.now) < c.p.startOn) return false;
    const last = c.sent("reminder");
    if (last && istDay(last) === istDay(c.now)) return false;
    if (istHour(c.now) < num(c.p.hour, 18)) return false;
    if (c.p.skipToday === "yes" && u.last_seen_at && istDay(Date.parse(u.last_seen_at)) === istDay(c.now)) return false;
    return true;
  },
};

/* Abandoned checkout: one reminder, then the discount, each once per checkout. */
const cartStep = (id: string, template: string, title: string, hours: string, extra: string): StepDef => ({
  id,
  template,
  title,
  wait: `{hours}h after they start checkout without paying`,
  rule: `Started checkout in the last {days} days, at least {hours}h ago, hasn't paid or subscribed since, and hasn't had this email for that checkout.${extra}`,
  params: [{ key: "hours", label: "Hours after checkout started", default: hours }, { key: "days", label: "Only checkouts in the last N days", default: "7" }],
  due: (_u, c) => {
    const k = c.checkout;
    if (!k || k.at > c.now - num(c.p.hours, Number(hours)) * H || k.at < c.now - num(c.p.days, 7) * D) return false;
    /* Also counts a one-off campaign of the same email, or the discount having gone already. */
    const last = Math.max(c.sent(id) ?? 0, c.history(template) ?? 0, c.history("nursia-cart-recovery") ?? 0);
    return last < k.at;
  },
});

/* "Now on Android" to everyone who could install it; the 4–6 hour gap spaces it from their other emails. */
const androidBatch: StepDef = {
  id: "android",
  template: "nursia-app-install",
  title: "Now on Android",
  wait: "Every day from {hour}:00 India time, to everyone due",
  rule: "Doesn't use the Android app yet, isn't iPhone-only (PostHog's OS), and has never had this email. Android-phone users first, then by intent. Anyone emailed in the last 4–6 hours gets it once that's passed.",
  params: [{ key: "hour", label: "Send from (hour, India time)", default: "6" }],
  due: (_u, c) => {
    if (istHour(c.now) < num(c.p.hour, 6)) return false;
    if (c.hasApp || c.sent("android") || c.history("nursia-app-install")) return false;
    return !(c.os.includes("iOS") && !c.os.includes("Android"));
  },
  rank: (_u, c) => (c.os.includes("Android") ? 1000 : 0) + c.intent,
};

/* Signed up but never finished onboarding: one nudge to come back and finish. */
const dropoff: StepDef = {
  id: "dropoff",
  template: "nursia-onboarding-dropoff",
  title: "Finish setting up",
  wait: "{hours}h after sign-up, if they still haven't finished onboarding",
  rule: "Signed up at least {hours}h ago, hasn't finished onboarding, and hasn't had this email.",
  params: [{ key: "hours", label: "Hours after sign-up", default: "2" }],
  due: (u, c) => !u.has_completed_onboarding && !c.sent("dropoff") && !c.history("nursia-onboarding-dropoff") && Date.parse(u.created_at) < c.now - num(c.p.hours, 2) * H,
};

export const FLOWS: FlowDef[] = [
  {
    id: "nursia-onboarding",
    name: "Nursia onboarding",
    db: "nursia",
    description: "Welcome 15 minutes after onboarding, then four emails that follow what each account actually does.",
    steps: [
      welcome("nursia-onboarding-welcome"),
      {
        id: "e2",
        template: "nursia-onboarding-02",
        title: "Nudge: first question",
        wait: "{hours}h after the welcome, only if they still haven't practised",
        rule: "Got the welcome at least {hours}h ago and still hasn't answered a question.",
        params: [{ key: "hours", label: "Hours after welcome", default: "24" }],
        due: (_u, c) => { const w = c.sent("welcome"); return !!w && w < c.now - num(c.p.hours, 24) * H && !active(c) && !c.sent("e2"); },
      },
      {
        id: "e3",
        template: "nursia-onboarding-03",
        title: "Your numbers",
        wait: "Once they've started practising",
        rule: "Has answered at least one question, got the welcome at least {hours}h ago, and hasn't had this email.",
        params: [{ key: "hours", label: "Hours after welcome, at least", default: "24" }],
        due: (_u, c) => { const w = c.sent("welcome"); return !!w && w < c.now - num(c.p.hours, 24) * H && active(c) && !c.sent("e3"); },
      },
      {
        id: "e4",
        template: "nursia-onboarding-04",
        title: "Win-back: two-step question",
        wait: "If they go quiet for {quietHours}h",
        rule: "Got 'Your numbers', not seen for {quietHours}h, more than {threshold} free questions left, no win-back in 14 days.",
        params: [{ key: "quietHours", label: "Quiet for at least N hours", default: "72" }, { key: "threshold", label: "Skip if free questions left ≤", default: "10" }],
        due: (u, c) => {
          if (!c.sent("e3") || c.sent("e5")) return false;
          const last = u.last_seen_at ? Date.parse(u.last_seen_at) : 0;
          const e4 = c.sent("e4");
          return last < c.now - num(c.p.quietHours, 72) * H && freeLeft(c) > num(c.p.threshold, 10) && (!e4 || e4 < c.now - 14 * D);
        },
      },
      {
        id: "e5",
        template: "nursia-onboarding-05",
        title: "What full access costs",
        wait: "When the free tier is nearly used, or after {days} days",
        rule: "Got 'Your numbers', and either has ≤ {threshold} free questions left or got the welcome {days}+ days ago. The series ends here.",
        params: [{ key: "threshold", label: "Free questions left ≤", default: "10" }, { key: "days", label: "…or days since welcome", default: "21" }],
        due: (_u, c) => { const w = c.sent("welcome"); return !!c.sent("e3") && !c.sent("e5") && (freeLeft(c) <= num(c.p.threshold, 10) || (!!w && w < c.now - num(c.p.days, 21) * D)); },
      },
    ],
  },
  {
    id: "prepclever-onboarding",
    name: "PrepClever onboarding",
    db: "prepclever",
    description: "Welcome 15 minutes after onboarding.",
    steps: [welcome("prepclever-onboarding-welcome")],
  },
  {
    id: "nursia-daily-reminder",
    name: "Nursia daily reminder",
    db: "nursia",
    description: "A friendly email every evening asking for ten minutes of practice, with the Android app. Links go to the login page.",
    everyone: true,
    allUsers: true,
    steps: [reminder],
  },
  {
    id: "nursia-onboarding-dropoff",
    name: "Nursia: finish onboarding",
    db: "nursia",
    description: "People who signed up but never finished onboarding get one email, a couple of hours later, to come back and finish. Everyone already in that state gets it too.",
    everyone: true,
    allUsers: true,
    history: ["nursia-onboarding-dropoff"],
    steps: [dropoff],
  },
  {
    id: "nursia-android-batch",
    name: "Nursia: Now on Android",
    db: "nursia",
    description: "Works through everyone who could install the Android app, a batch each morning: people PostHog has seen on an Android phone first, then by intent. Stops when everyone's had it.",
    everyone: true,
    allUsers: true,
    needs: ["devices", "os", "commerce", "paidOrders", "subs"],
    history: ["nursia-app-install"],
    steps: [androidBatch],
  },
  {
    id: "nursia-cart-recovery",
    name: "Nursia cart recovery",
    db: "nursia",
    description: "Someone starts checkout and doesn't pay: a reminder after an hour, then 50% off (FLAT50) after a day. Stops as soon as they pay.",
    everyone: true,
    allUsers: true,
    needs: ["commerce", "paidOrders", "subs"],
    history: ["nursia-checkout-reminder", "nursia-cart-recovery"],
    steps: [
      cartStep("reminder", "nursia-checkout-reminder", "Checkout reminder", "1", ""),
      cartStep("recovery", "nursia-cart-recovery", "Cart recovery: 50% off", "24", " Only after the reminder."),
    ],
  },
  {
    id: "nursia-daily",
    name: "Nursia daily quiz",
    db: "nursia",
    description: "Three NCLEX questions every morning, answered from the inbox.",
    everyone: true,
    steps: [daily("nursia")],
  },
  {
    id: "prepclever-daily",
    name: "PrepClever daily quiz",
    db: "prepclever",
    description: "Three questions from each person's own exam every morning, answered from the inbox.",
    everyone: true,
    steps: [daily("prepclever")],
  },
];

export const getFlow = (fid: string) => FLOWS.find((f) => f.id === fid);

function stepParams(st: FlowState, step: StepDef) {
  const saved = st.params[step.id] ?? {};
  return Object.fromEntries(step.params.map((p) => [p.key, saved[p.key] ?? p.default]));
}

const fill = (st: FlowState, step: StepDef, text: string) => {
  const p = stepParams(st, step);
  return text.replace(/\{(\w+)\}/g, (_m, k) => p[k] ?? k);
};

/* ── watching for new onboardings ─────────────────────────────────────── */

async function watch(flow: FlowDef, s: Snapshot, st: FlowState, enrolled: Map<string, Enrollment>) {
  const onboarded = s.users.filter((u) => (flow.allUsers || u.has_completed_onboarding) && !enrolled.has(u.id));
  if (!onboarded.length && st.baselineAt) return 0;
  const baseline = !st.baselineAt;
  await addEnrollments(flow.id, onboarded.map((u) => ({ userId: u.id, email: u.email.toLowerCase(), baseline })));
  if (baseline) {
    st.baselineAt = new Date().toISOString();
    await saveFlowState(flow.id, st);
  }
  return onboarded.length;
}

/* ── who's due ────────────────────────────────────────────────────────── */

/** The cohort score: started checkout 50, paywall 25, recent use up to 30, practice up to 20, onboarded 10, exam within 120 days 15. */
function intentScore(u: User, s: Snapshot, now: number) {
  const ev = s.commerce?.get(u.id) ?? [];
  const recent = (name: string) => ev.some((e) => e.event_name === name && Date.parse(e.claimed_at) > now - 30 * D);
  const seen = u.last_seen_at ? (now - Date.parse(u.last_seen_at)) / D : Infinity;
  let n = 0;
  if (recent("InitiateCheckout") && !s.paidOrders?.has(u.id) && !s.subs?.has(u.id)) n += 50;
  if (recent("ViewContent")) n += 25;
  n += seen <= 3 ? 30 : seen <= 7 ? 20 : seen <= 14 ? 10 : 0;
  n += Math.min(u.questions_answered_count ?? 0, 100) / 5;
  if (u.has_completed_onboarding) n += 10;
  if (u.exam_date && Date.parse(u.exam_date) > now && Date.parse(u.exam_date) < now + 120 * D) n += 15;
  return n;
}

/** The latest checkout they started and didn't finish: no purchase after it, no paid order, no live plan. */
function unpaidCheckout(u: User, s: Snapshot) {
  if (s.paidOrders?.has(u.id) || s.subs?.has(u.id)) return null;
  const ev = s.commerce?.get(u.id) ?? [];
  const last = ev.filter((e) => e.event_name === "InitiateCheckout").sort((a, b) => b.claimed_at.localeCompare(a.claimed_at))[0];
  if (!last) return null;
  if (ev.some((e) => (e.event_name === "Purchase" || e.event_name === "Subscribe") && e.claimed_at >= last.claimed_at)) return null;
  return { at: Date.parse(last.claimed_at), cart: last.order_ref ?? "" };
}

type Due = { user: User; contact: Record<string, string> & { email: string } };

export async function dueNow(flow: FlowDef) {
  const needs: Extra[] = [...(flow.db === "nursia" ? ["subs", "practised"] as const : ["subs"] as const), ...(flow.everyone ? ["streaks"] as const : []), ...(flow.needs ?? [])];
  const s = await snapshot(flow.db, [...new Set(needs)]);
  const st = await getFlowState(flow.id);
  let enrolled = await getEnrollments(flow.id);
  if ((await watch(flow, s, st, enrolled)) > 0) enrolled = await getEnrollments(flow.id);
  const blocked = await suppressedSet();
  const hist = await templateHistory(flow.history ?? []);
  const now = Date.now();
  const out: Record<string, Due[]> = Object.fromEntries(flow.steps.map((x) => [x.id, []]));
  const ranks = new Map<Due, number>();
  const exits = { subscribed: 0, suppressed: 0, internal: 0, undeliverable: 0, noQuestions: 0 };
  /* A PrepClever daily set needs questions for their exam; no exam set falls back to a stocked one. */
  const ready = flow.everyone && flow.db === "prepclever" ? await prepcleverQuizExams() : null;

  for (const u of s.users) {
    const e = enrolled.get(u.id);
    if (!e || (e.baseline && !flow.everyone)) continue;
    if (u.is_internal) { exits.internal++; continue; }
    if (undeliverable(u.email.toLowerCase())) { exits.undeliverable++; continue; }
    if (s.subs!.has(u.id) && !flow.everyone) { exits.subscribed++; continue; }
    if (blocked.has(u.email.toLowerCase())) { exits.suppressed++; continue; }
    if (ready && u.selected_exam_series_id && !ready.has(u.selected_exam_series_id)) { exits.noQuestions++; continue; }

    const base = {
      now,
      firstSeen: Date.parse(e.firstSeen),
      answered: u.questions_answered_count ?? 0,
      practised: s.practised?.has(u.id) ?? false,
      sent: (k: string) => (e.steps[k] ? Date.parse(e.steps[k]) : null),
      checkout: s.commerce ? unpaidCheckout(u, s) : null,
      history: (t: string) => hist.get(t)?.get(u.email.toLowerCase()) ?? null,
      os: s.os?.get(u.id) ?? [],
      hasApp: s.devices?.get(u.id)?.has("android") ?? false,
      intent: s.commerce ? intentScore(u, s, now) : 0,
    };
    /* Cart recovery: the discount only once the reminder went for this checkout. */
    const gated = (id: string) => id !== "recovery" || !flow.steps.some((x) => x.id === "reminder") || (base.sent("reminder") ?? 0) >= (base.checkout?.at ?? Infinity);
    let dueSteps = flow.steps.filter((step) => step.due(u, { ...base, p: stepParams(st, step) })).map((x) => x.id).filter(gated);
    if (dueSteps.includes("e5")) dueSteps = dueSteps.filter((x) => x !== "e4");
    for (const sid of dueSteps) {
      const step = flow.steps.find((x) => x.id === sid)!;
      const d: Due = {
        user: u,
        contact: {
          ...fields(flow.db, u),
          email: u.email.toLowerCase(),
          free_remaining: String(Math.max(0, FREE_QUESTIONS - base.answered)),
          daily_target: u.ngn_daily_goal ? String(u.ngn_daily_goal) : "",
          cart_id: base.checkout?.cart ?? "",
          streak_days: s.streaks?.get(u.id)?.current_streak ? String(s.streaks.get(u.id)!.current_streak) : "",
        },
      };
      out[sid].push(d);
      if (step.rank) ranks.set(d, step.rank(u, { ...base, p: stepParams(st, step) }));
    }
  }
  /* A step with a daily allowance: the best-ranked first, up to what's left of today's. */
  for (const step of flow.steps) {
    const p = stepParams(st, step);
    if (p.perDay === undefined) continue;
    const left = Math.max(0, num(p.perDay, 0) - (await flowSendsToday(flow.id, step.id)));
    out[step.id] = out[step.id].sort((a, b) => (ranks.get(b) ?? 0) - (ranks.get(a) ?? 0)).slice(0, left);
  }
  const watched = [...enrolled.values()].filter((x) => flow.everyone || !x.baseline).length;
  return { due: out, exits, st, watched, baselineAt: st.baselineAt };
}

/* ── the page's view ──────────────────────────────────────────────────── */

export async function overviewOf(flow: FlowDef) {
  const { due, exits, st, watched } = await dueNow(flow);
  const runs = await sql`select id, created_at, status, doc from campaigns where doc->'flow'->>'id' = ${flow.id} order by created_at desc`;
  const stats = await statsFor(runs.map((r) => r.id as string));
  const subjects = await Promise.all(flow.steps.map((step) => { const t = getTemplate(step.template); return sampleSubject(t?.subject, t?.sample); }));
  const steps = flow.steps.map((step, si) => {
    const mine = runs.filter((r) => r.doc?.flow?.step === step.id);
    const t = mine.map((r) => stats.get(r.id)!).reduce(
      (a, x) => ({ sent: a.sent + x.sent, delivered: a.delivered + x.delivered, opened: a.opened + x.opened, clicked: a.clicked + x.clicked, unsubscribed: a.unsubscribed + x.unsubscribed }),
      { sent: 0, delivered: 0, opened: 0, clicked: 0, unsubscribed: 0 },
    );
    const tpl = getTemplate(step.template);
    return {
      id: step.id,
      title: step.title,
      template: step.template,
      templateName: tpl?.name,
      subject: subjects[si],
      wait: fill(st, step, step.wait),
      rule: fill(st, step, step.rule),
      params: step.params.map((p) => ({ ...p, value: stepParams(st, step)[p.key] })),
      due: due[step.id].length,
      dueSample: due[step.id].slice(0, 50).map((d) => ({ email: d.contact.email, first_name: d.contact.first_name, signed_up: d.contact.signed_up, last_seen: d.contact.last_seen, questions_answered: d.contact.questions_answered })),
      runs: mine.map((r) => ({ id: r.id, at: r.doc?.sentAt ?? r.created_at, status: r.status, sent: stats.get(r.id)!.sent })),
      totals: { ...t, openRate: t.delivered ? t.opened / t.delivered : null, clickRate: t.delivered ? t.clicked / t.delivered : null },
      running: st.running === step.id,
    };
  });
  /* The same checks the tick applies, so the page only warns about what would actually stop it. */
  const s = await getSettings();
  const blocked = (await senderChecks({ brand: flow.db, from: fromLine(s, flow.db) })).filter(blocksAutomatic).map((x) => x.text);
  return { id: flow.id, name: flow.name, brand: flow.db, description: flow.description, autoRun: st.autoRun, lastRunAt: st.lastRunAt, lastAutoResult: st.lastAutoResult, enrolled: watched, baselineAt: st.baselineAt, exits, steps, blocked, everyone: !!flow.everyone };
}

/* ── every automation at a glance ─────────────────────────────────────── */

/**
 * When an automation next sends. A step with a set hour runs once a day from
 * that hour (India time); the rest go whenever someone becomes due, which the
 * 5-minute check picks up.
 */
async function scheduleOf(f: FlowDef, st: FlowState) {
  const timed = f.steps.find((s) => s.params.some((p) => p.key === "hour"));
  const now = Date.now();
  const tick = Math.ceil(now / (5 * 60_000)) * 5 * 60_000;
  if (!timed) return { schedule: "As people become due · checked every 5 minutes", nextAt: new Date(tick).toISOString() };
  const p = stepParams(st, timed);
  const hour = num(p.hour, 9);
  const istMidnight = Date.parse(`${istDay(now)}T00:00:00Z`) - IST;
  let at = istMidnight + hour * H;
  const doneToday = (await flowSendsToday(f.id, timed.id)) > 0;
  if (now >= at) at = doneToday ? at + D : tick;
  if (p.startOn) at = Math.max(at, Date.parse(`${p.startOn}T00:00:00Z`) - IST + hour * H);
  return { schedule: fill(st, timed, timed.wait), nextAt: new Date(at).toISOString() };
}

/** On/off and lifetime results per automation, from its sends alone (no app reads, so it's quick). */
export async function flowsSummary() {
  const runs = await sql`select id, doc->'flow'->>'id' as flow from campaigns where doc ? 'flow'`;
  const stats = await statsFor(runs.map((r) => r.id as string));
  return Promise.all(FLOWS.map(async (f) => {
    const st = await getFlowState(f.id);
    const t = runs.filter((r) => r.flow === f.id).map((r) => stats.get(r.id as string)!).reduce(
      (a, x) => ({ sent: a.sent + x.sent, delivered: a.delivered + x.delivered, opened: a.opened + x.opened, clicked: a.clicked + x.clicked, unsubscribed: a.unsubscribed + x.unsubscribed, queued: a.queued + x.queued }),
      { sent: 0, delivered: 0, opened: 0, clicked: 0, unsubscribed: 0, queued: 0 },
    );
    const { schedule, nextAt } = await scheduleOf(f, st);
    return {
      id: f.id, name: f.name, brand: f.db, autoRun: !!st.autoRun, lastRunAt: st.lastRunAt, lastAutoResult: st.lastAutoResult, schedule, nextAt: st.autoRun ? nextAt : null,
      totals: { ...t, openRate: t.delivered ? t.opened / t.delivered : null, clickRate: t.delivered ? t.clicked / t.delivered : null },
    };
  }));
}

/* ── sending ──────────────────────────────────────────────────────────── */

function fromLine(s: Awaited<ReturnType<typeof getSettings>>, brand: "nursia" | "prepclever") {
  const b = s.brands[brand];
  return `${b.fromName} <${b.fromEmail}>`;
}

export async function sendStepTest(flow: FlowDef, stepId: string, to: string) {
  const step = flow.steps.find((x) => x.id === stepId);
  if (!step) throw new Error("No such step");
  const { due } = await dueNow(flow);
  const t = getTemplate(step.template)!;
  const s = await getSettings();
  const sample = due[stepId][0]?.contact ?? {};
  const fake = { id: `test_${flow.id}_${stepId}`, templateId: t.id, brand: t.brand, subject: t.subject, from: fromLine(s, t.brand), replyTo: s.brands[t.brand].replyTo, listId: "", vars: sample } as unknown as Campaign;
  return sendTest(fake, to, settingsWithSecret(s));
}

/**
 * Sends one step to everyone due for it. `confirm` is the count the person
 * saw; if the due list moved since, nothing goes out. "auto" is the tick,
 * which is stricter about warnings.
 */
export async function sendStep(flow: FlowDef, stepId: string, confirm: number | "auto") {
  const step = flow.steps.find((x) => x.id === stepId);
  if (!step) throw new Error("No such step");
  const { due, st } = await dueNow(flow);
  if (st.running) throw new Error(`${st.running} is still sending; wait for it to finish`);
  const list = due[stepId];
  if (!list.length) throw new Error("Nobody is due for this step right now");
  if (confirm !== "auto" && confirm !== list.length) throw new Error(`${list.length} people are due now, not ${confirm}; check the list again`);

  const t = getTemplate(step.template)!;
  const s = await getSettings();
  const checks = await senderChecks({ brand: t.brand, from: fromLine(s, t.brand) });
  const blocking = checks.filter((x) => x.level === "block" || (confirm === "auto" && blocksAutomatic(x)));
  if (blocking.length) throw new Error(blocking.map((x) => x.text).join(" "));

  const stamp = new Date().toISOString();
  const listId = id("list");
  await saveList({ id: listId, name: `${flow.name} · ${step.title} · ${stamp.slice(0, 16).replace("T", " ")}`, createdAt: stamp, contacts: list.map((d) => d.contact), hidden: true });
  const c: Campaign = {
    id: id("cmp"),
    name: `${flow.name} · ${step.title}`,
    templateId: t.id,
    brand: t.brand,
    subject: t.subject,
    from: fromLine(s, t.brand),
    replyTo: s.brands[t.brand].replyTo,
    listId,
    listIds: [listId],
    vars: {},
    status: "draft",
    createdAt: stamp,
    flow: { id: flow.id, step: stepId },
    rotate: true,
  };
  await saveCampaign(c);
  st.running = stepId;
  await saveFlowState(flow.id, st);
  try {
    await startCampaign(c);
  } catch (e) {
    st.running = undefined;
    await saveFlowState(flow.id, st);
    throw e;
  }
  return { campaignId: c.id, count: list.length };
}

/** One step per tick: the first one with anyone due. The next tick takes the next. */
export async function runNextDue(flow: FlowDef) {
  const { due, st } = await dueNow(flow);
  if (st.running) return `waiting for ${st.running} to finish`;
  const step = flow.steps.find((s) => due[s.id].length);
  if (!step) return "nobody due";
  const r = await sendStep(flow, step.id, "auto");
  return `sending ${step.title} to ${r.count}`;
}

export async function setFlow(fid: string, patch: { autoRun?: boolean; params?: Record<string, Record<string, string>> }) {
  const st = await getFlowState(fid);
  if (patch.autoRun !== undefined) st.autoRun = !!patch.autoRun;
  if (patch.params) for (const [k, v] of Object.entries(patch.params)) st.params[k] = { ...(st.params[k] ?? {}), ...v };
  await saveFlowState(fid, st);
}

/** The 5-minute tick: enrol new onboardings everywhere, and send for flows that are switched on. */
export async function tick() {
  const results: string[] = [];
  for (const flow of FLOWS) {
    try {
      const st = await getFlowState(flow.id);
      if (!st.autoRun) {
        /* Still watch, so the baseline is set and nobody is missed when it's switched on. */
        await dueNow(flow);
        results.push(`${flow.id}: watching (automatic sending is off)`);
        continue;
      }
      const r = await runNextDue(flow);
      const fresh = await getFlowState(flow.id);
      fresh.lastAutoResult = `${new Date().toISOString()}: ${r}`;
      fresh.lastRunAt = new Date().toISOString();
      await saveFlowState(flow.id, fresh);
      results.push(`${flow.id}: ${r}`);
    } catch (e) {
      const fresh = await getFlowState(flow.id);
      fresh.lastAutoResult = `${new Date().toISOString()}: stopped: ${(e as Error).message}`;
      await saveFlowState(flow.id, fresh);
      results.push(`${flow.id}: ${(e as Error).message}`);
    }
  }
  return results;
}
