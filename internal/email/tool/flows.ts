import { db, id, save, type Campaign, type FlowState, type Settings } from "./store";
import { fields, snapshot, undeliverable, type Snapshot, type User } from "./audiences";
import { runCampaign, sendTest, stats, suppressedSet } from "./campaigns";
import { getTemplate } from "./templates";

/**
 * The onboarding sequence from internal/email/onboarding/README.md, as steps
 * you can see and send from the dashboard.
 *
 * Each step is a rule over the user's current state in Supabase plus which
 * steps they've already had, re-evaluated every time the page loads — not a
 * timer set at signup. That's the README's point: a delay can't cancel itself
 * when the thing it was waiting for happens, a re-check can.
 *
 * Proxies, until the app tracks the real events:
 * - "onboarding_completed at"  -> when E1 was sent (we only enrol on completion)
 * - "quiz_completed"           -> questions_answered_count >= 1, or any NGN attempt
 * - "free_questions_remaining" -> 50 minus questions_answered_count
 *
 * Sending a step makes an ordinary campaign (tagged with the step), so opens,
 * clicks and unsubscribes land on the dashboard like everything else. Who got
 * what is kept per Supabase user id, so a step never reaches someone twice.
 */

const H = 3600_000;
const D = 24 * H;
const FREE_QUESTIONS = 50;

type Param = { key: string; label: string; default: string };

type Ctx = {
  now: number;
  sent: (step: string) => number | null;
  answered: number;
  practised: boolean;
  p: Record<string, string>;
};

export type StepDef = {
  id: string;
  template: string;
  title: string;
  /** Plain-English rule, with {param} placeholders filled from the step's settings. */
  rule: string;
  /** What the arrow into this step says. */
  wait: string;
  params: Param[];
  due: (u: User, c: Ctx) => boolean;
};

export type FlowDef = { id: string; name: string; db: "nursia"; description: string; steps: StepDef[] };

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const freeLeft = (c: Ctx) => Math.max(0, FREE_QUESTIONS - c.answered);
const active = (c: Ctx) => c.answered > 0 || c.practised;

export const ONBOARDING: FlowDef = {
  id: "nursia-onboarding",
  name: "Nursia onboarding",
  db: "nursia",
  description: "Five emails that follow what each account actually did — activation, retention, then conversion.",
  steps: [
    {
      id: "e1",
      template: "nursia-onboarding-01",
      title: "Welcome — your plan",
      wait: "Starts when someone finishes onboarding",
      rule: "Finished onboarding, account created in the last {enrollDays} days, and hasn't had this email.",
      params: [{ key: "enrollDays", label: "Only accounts created in the last N days", default: "7" }],
      due: (u, c) => !!u.has_completed_onboarding && !c.sent("e1") && Date.parse(u.created_at) > c.now - num(c.p.enrollDays, 7) * D,
    },
    {
      id: "e2",
      template: "nursia-onboarding-02",
      title: "Activation nudge — first question",
      wait: "{hours}h after E1, only if they still haven't practised",
      rule: "Got E1 at least {hours}h ago and still hasn't answered a single question.",
      params: [{ key: "hours", label: "Hours after E1", default: "24" }],
      due: (_u, c) => {
        const e1 = c.sent("e1");
        return !!e1 && e1 < c.now - num(c.p.hours, 24) * H && !active(c) && !c.sent("e2");
      },
    },
    {
      id: "e3",
      template: "nursia-onboarding-03",
      title: "Your numbers",
      wait: "Once they've started practising",
      rule: "Has answered at least one question, got E1 at least {hours}h ago, and hasn't had this email.",
      params: [{ key: "hours", label: "Hours after E1, at least", default: "24" }],
      due: (_u, c) => {
        const e1 = c.sent("e1");
        return !!e1 && e1 < c.now - num(c.p.hours, 24) * H && active(c) && !c.sent("e3");
      },
    },
    {
      id: "e4",
      template: "nursia-onboarding-04",
      title: "Win-back — two-step question",
      wait: "If they go quiet for {quietHours}h",
      rule: "Got E3, not seen for {quietHours}h, more than {threshold} free questions left, no win-back in the last 14 days.",
      params: [
        { key: "quietHours", label: "Quiet for at least N hours", default: "72" },
        { key: "threshold", label: "Skip if free questions left ≤", default: "10" },
      ],
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
      title: "Conversion — what full access costs",
      wait: "When the free tier is nearly used, or after {days} days",
      rule: "Got E3, and either has ≤ {threshold} free questions left or got E1 {days}+ days ago. Sent once; the sequence ends here.",
      params: [
        { key: "threshold", label: "Free questions left ≤", default: "10" },
        { key: "days", label: "…or days since E1", default: "21" },
      ],
      due: (_u, c) => {
        const e1 = c.sent("e1");
        return !!c.sent("e3") && !c.sent("e5") && (freeLeft(c) <= num(c.p.threshold, 10) || (!!e1 && e1 < c.now - num(c.p.days, 21) * D));
      },
    },
  ],
};

export const FLOWS = [ONBOARDING];

export function flowState(fid: string): FlowState {
  return (db.flows[fid] ??= { autoRun: false, params: {}, enrolled: {} });
}

function stepParams(fid: string, step: StepDef) {
  const saved = flowState(fid).params[step.id] ?? {};
  return Object.fromEntries(step.params.map((p) => [p.key, saved[p.key] ?? p.default]));
}

export function ruleText(fid: string, step: StepDef, text: string) {
  const p = stepParams(fid, step);
  return text.replace(/\{(\w+)\}/g, (_m, k) => p[k] ?? k);
}

/* ── Who's due ────────────────────────────────────────────────────────── */

type Due = { user: User; contact: Record<string, string> & { email: string } };

/**
 * Everyone due for each step right now. Exits are checked first and apply to
 * every step: a paying subscriber, an unsubscribe/bounce, an internal or
 * undeliverable account never gets a flow email. When one person is due for
 * both E4 and E5, E5 wins (README: don't spend a win-back on someone about to
 * see the price).
 */
export async function dueNow(flow: FlowDef) {
  const s: Snapshot = await snapshot(flow.db, ["subs", "practised"]);
  const st = flowState(flow.id);
  const blocked = suppressedSet();
  const now = Date.now();
  const out: Record<string, Due[]> = Object.fromEntries(flow.steps.map((x) => [x.id, []]));
  const exits = { subscribed: 0, suppressed: 0, internal: 0, undeliverable: 0 };

  for (const u of s.users) {
    if (u.is_internal) { exits.internal++; continue; }
    if (undeliverable(u.email.toLowerCase())) { exits.undeliverable++; continue; }
    if (s.subs!.has(u.id)) { exits.subscribed++; continue; }
    if (blocked.has(u.email.toLowerCase())) { exits.suppressed++; continue; }

    const had = st.enrolled[u.id]?.steps ?? {};
    const base = { now, answered: u.questions_answered_count ?? 0, practised: s.practised!.has(u.id), sent: (k: string) => (had[k] ? Date.parse(had[k]) : null) };
    let dueSteps = flow.steps.filter((step) => step.due(u, { ...base, p: stepParams(flow.id, step) })).map((x) => x.id);
    if (dueSteps.includes("e5")) dueSteps = dueSteps.filter((x) => x !== "e4");

    for (const sid of dueSteps) {
      const answered = base.answered;
      out[sid].push({
        user: u,
        contact: {
          ...fields(flow.db, u),
          email: u.email.toLowerCase(),
          free_remaining: String(Math.max(0, FREE_QUESTIONS - answered)),
          daily_target: u.ngn_daily_goal ? String(u.ngn_daily_goal) : "",
        },
      });
    }
  }
  return { due: out, exits };
}

/* ── Stats and the page's view of the flow ───────────────────────────── */

export async function overviewOf(flow: FlowDef) {
  const st = flowState(flow.id);
  const { due, exits } = await dueNow(flow);
  const steps = flow.steps.map((step) => {
    const runs = db.campaigns.filter((c) => c.flow?.id === flow.id && c.flow.step === step.id);
    const t = runs.map(stats).reduce(
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
      wait: ruleText(flow.id, step, step.wait),
      rule: ruleText(flow.id, step, step.rule),
      params: step.params.map((p) => ({ ...p, value: stepParams(flow.id, step)[p.key] })),
      due: due[step.id].length,
      dueSample: due[step.id].slice(0, 50).map((d) => ({ email: d.contact.email, first_name: d.contact.first_name, signed_up: d.contact.signed_up, last_seen: d.contact.last_seen, questions_answered: d.contact.questions_answered })),
      runs: runs.map((c) => ({ id: c.id, at: c.sentAt ?? c.createdAt, status: c.status, sent: stats(c).sent })).reverse(),
      totals: { ...t, openRate: t.delivered ? t.opened / t.delivered : null, clickRate: t.delivered ? t.clicked / t.delivered : null },
      running: st.running === step.id,
    };
  });
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    autoRun: st.autoRun,
    lastRunAt: st.lastRunAt,
    lastAutoResult: st.lastAutoResult,
    enrolled: Object.keys(st.enrolled).length,
    exits,
    steps,
  };
}

/* ── Sending ──────────────────────────────────────────────────────────── */

export type Checks = (c: Campaign) => Promise<{ checks: { level: "block" | "warn"; text: string }[] }>;

export async function sendStepTest(flow: FlowDef, stepId: string, to: string, settings: Settings) {
  const step = flow.steps.find((x) => x.id === stepId);
  if (!step) throw new Error("No such step");
  const { due } = await dueNow(flow);
  const t = getTemplate(step.template)!;
  const sample = due[stepId][0]?.contact ?? {};
  const fake = {
    id: `test_${flow.id}_${stepId}`,
    templateId: t.id,
    brand: t.brand,
    subject: t.subject,
    from: fromLine(t.brand),
    replyTo: db.settings.brands[t.brand].replyTo,
    listId: "",
    vars: sample,
  } as unknown as Campaign;
  return sendTest(fake, to, settings);
}

function fromLine(brand: "nursia" | "prepclever") {
  const b = db.settings.brands[brand];
  return `${b.fromName} <${b.fromEmail}>`;
}

/**
 * Sends one step to everyone due for it. `confirm` is the count the person
 * saw; if the due list moved since, nothing goes out and they look again.
 * Returns once the run has started; the send itself carries on in the background.
 */
export async function sendStep(flow: FlowDef, stepId: string, confirm: number | "auto", settings: Settings, checks: Checks) {
  const step = flow.steps.find((x) => x.id === stepId);
  if (!step) throw new Error("No such step");
  const st = flowState(flow.id);
  if (st.running) throw new Error(`Step ${st.running.toUpperCase()} is still sending — wait for it to finish`);

  const { due } = await dueNow(flow);
  const list = due[stepId];
  if (!list.length) throw new Error("Nobody is due for this step right now");
  if (confirm !== "auto" && confirm !== list.length) throw new Error(`${list.length} people are due now, not ${confirm} — check the list again`);

  const t = getTemplate(step.template)!;
  const stamp = new Date().toISOString();
  const listRec = { id: id("list"), name: `${flow.name} · ${stepId.toUpperCase()} · ${stamp.slice(0, 16).replace("T", " ")}`, createdAt: stamp, contacts: list.map((d) => d.contact), hidden: true };
  const c: Campaign = {
    id: id("cmp"),
    name: `${flow.name} · ${stepId.toUpperCase()} — ${step.title}`,
    templateId: t.id,
    brand: t.brand,
    subject: t.subject,
    from: fromLine(t.brand),
    replyTo: db.settings.brands[t.brand].replyTo,
    listId: listRec.id,
    vars: {},
    status: "draft",
    createdAt: stamp,
    sends: [],
    flow: { id: flow.id, step: stepId },
  };
  db.lists.push(listRec);
  db.campaigns.push(c);

  /* Unattended runs are stricter than a person clicking Send: they also stop
     on a dead unsubscribe link or a blank postal address, since nobody is
     there to read the warning first. */
  const blocking = (await checks(c)).checks.filter(
    (x) => x.level === "block" || (confirm === "auto" && /unsubscribe page|postal address/i.test(x.text)),
  );
  if (blocking.length) {
    db.campaigns = db.campaigns.filter((x) => x.id !== c.id);
    db.lists = db.lists.filter((x) => x.id !== listRec.id);
    throw new Error(blocking.map((x) => x.text).join(" "));
  }

  st.running = stepId;
  c.status = "sending";
  save();

  const userByEmail = new Map(list.map((d) => [d.contact.email, d.user]));
  runCampaign(c, settings)
    .catch((e) => {
      c.status = "failed";
      c.error = (e as Error).message;
    })
    .finally(() => {
      /* Only a send Resend accepted counts as "had this step"; a failure stays
         due and shows up again next time. */
      for (const s of c.sends) {
        const u = userByEmail.get(s.email.toLowerCase());
        if (!u || s.status !== "sent") continue;
        const rec = (st.enrolled[u.id] ??= { email: u.email, steps: {} });
        rec.steps[stepId] = s.sentAt ?? new Date().toISOString();
      }
      st.running = undefined;
      st.lastRunAt = new Date().toISOString();
      save();
    });
  return { campaignId: c.id, count: list.length };
}

/** Every step with someone due, in order, one after another. */
export async function runAllDue(flow: FlowDef, settings: Settings, checks: Checks) {
  const results: string[] = [];
  for (const step of flow.steps) {
    const { due } = await dueNow(flow);
    if (!due[step.id].length) continue;
    try {
      const r = await sendStep(flow, step.id, "auto", settings, checks);
      results.push(`${step.id.toUpperCase()}: ${r.count}`);
      /* Wait for this step to finish before the next re-check, so E1 going out
         now can't make anyone look due for E2 in the same pass. */
      while (flowState(flow.id).running) await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      /* Whatever stopped this step (a failed check, mostly) would stop the
         next one too; say it once and stop rather than repeat it per step. */
      results.push(`stopped at ${step.id.toUpperCase()} — ${(e as Error).message}`);
      break;
    }
  }
  return results.length ? `Sent ${results.join(" · ")}` : "Nobody due";
}

export function setFlow(fid: string, patch: { autoRun?: boolean; params?: Record<string, Record<string, string>> }) {
  const st = flowState(fid);
  if (patch.autoRun !== undefined) st.autoRun = !!patch.autoRun;
  if (patch.params) for (const [k, v] of Object.entries(patch.params)) st.params[k] = { ...(st.params[k] ?? {}), ...v };
  save();
}
