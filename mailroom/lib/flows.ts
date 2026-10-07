import {
  addEnrollments, getEnrollments, getFlowState, getSettings, id, saveCampaign, saveFlowState, saveList,
  suppressedSet, sql, statsFor, type Campaign, type Enrollment, type FlowState,
} from "./db";
import { fields, snapshot, undeliverable, type Snapshot, type User } from "./audiences";
import { sendTest, settingsWithSecret, startCampaign } from "./campaigns";
import { blocksAutomatic, senderChecks } from "./checks";
import { getTemplate } from "./templates";

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
type Ctx = { now: number; firstSeen: number; sent: (step: string) => number | null; answered: number; practised: boolean; p: Record<string, string> };

export type StepDef = { id: string; template: string; title: string; rule: string; wait: string; params: Param[]; due: (u: User, c: Ctx) => boolean };
export type FlowDef = { id: string; name: string; db: "nursia" | "prepclever"; description: string; steps: StepDef[] };

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
  const onboarded = s.users.filter((u) => u.has_completed_onboarding && !enrolled.has(u.id));
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

type Due = { user: User; contact: Record<string, string> & { email: string } };

export async function dueNow(flow: FlowDef) {
  const s = await snapshot(flow.db, flow.db === "nursia" ? ["subs", "practised"] : ["subs"]);
  const st = await getFlowState(flow.id);
  let enrolled = await getEnrollments(flow.id);
  if ((await watch(flow, s, st, enrolled)) > 0) enrolled = await getEnrollments(flow.id);
  const blocked = await suppressedSet();
  const now = Date.now();
  const out: Record<string, Due[]> = Object.fromEntries(flow.steps.map((x) => [x.id, []]));
  const exits = { subscribed: 0, suppressed: 0, internal: 0, undeliverable: 0 };

  for (const u of s.users) {
    const e = enrolled.get(u.id);
    if (!e || e.baseline) continue;
    if (u.is_internal) { exits.internal++; continue; }
    if (undeliverable(u.email.toLowerCase())) { exits.undeliverable++; continue; }
    if (s.subs!.has(u.id)) { exits.subscribed++; continue; }
    if (blocked.has(u.email.toLowerCase())) { exits.suppressed++; continue; }

    const base = {
      now,
      firstSeen: Date.parse(e.firstSeen),
      answered: u.questions_answered_count ?? 0,
      practised: s.practised?.has(u.id) ?? false,
      sent: (k: string) => (e.steps[k] ? Date.parse(e.steps[k]) : null),
    };
    let dueSteps = flow.steps.filter((step) => step.due(u, { ...base, p: stepParams(st, step) })).map((x) => x.id);
    if (dueSteps.includes("e5")) dueSteps = dueSteps.filter((x) => x !== "e4");
    for (const sid of dueSteps) {
      out[sid].push({
        user: u,
        contact: {
          ...fields(flow.db, u),
          email: u.email.toLowerCase(),
          free_remaining: String(Math.max(0, FREE_QUESTIONS - base.answered)),
          daily_target: u.ngn_daily_goal ? String(u.ngn_daily_goal) : "",
        },
      });
    }
  }
  const watched = [...enrolled.values()].filter((x) => !x.baseline).length;
  return { due: out, exits, st, watched, baselineAt: st.baselineAt };
}

/* ── the page's view ──────────────────────────────────────────────────── */

export async function overviewOf(flow: FlowDef) {
  const { due, exits, st, watched } = await dueNow(flow);
  const runs = await sql`select id, created_at, status, doc from campaigns where doc->'flow'->>'id' = ${flow.id} order by created_at desc`;
  const stats = await statsFor(runs.map((r) => r.id as string));
  const steps = flow.steps.map((step) => {
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
      subject: tpl?.subject,
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
  return { id: flow.id, name: flow.name, brand: flow.db, description: flow.description, autoRun: st.autoRun, lastRunAt: st.lastRunAt, lastAutoResult: st.lastAutoResult, enrolled: watched, baselineAt: st.baselineAt, exits, steps };
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
