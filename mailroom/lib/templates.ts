import { ASSETS, TEMPLATE_HTML } from "./content.generated";
import { getCustomTemplate, listCustomTemplates, type Asset, type CustomTemplate } from "./db";

/**
 * Every email the tool can send. The HTML lives beside this folder, untouched
 * apart from the footer address, which became {{ postal_address }} so the real
 * one is a setting rather than an edit to thirteen files.
 *
 * `vars` lists the merge fields a template reads that aren't on every contact.
 * They become inputs on the campaign form, and a CSV column with the same name
 * overrides them per recipient. `sample` is what the preview renders with.
 */

export type Brand = "nursia" | "prepclever";

export type TemplateDef = {
  id: string;
  brand: Brand;
  group: string;
  name: string;
  subject: string;
  /** Key into the compiled content, e.g. "nursia/welcome" or "onboarding/01-day0-your-plan". */
  file: string;
  /** How many interactive questions this email carries; their links mark and score each answer. */
  quiz?: number;
  vars: string[];
  sample: Record<string, string>;
  /** One line in plain words: who this is for. Shown on the template card. */
  purpose: string;
  /** The audience preset that fits it, offered first when picking people. */
  suggest?: { preset: string; params?: Record<string, string> };
  /** Brand settings the email can't do without; sending is blocked while one is blank. */
  requires?: ("playStoreUrl" | "appStoreUrl")[];
  /** Set on templates uploaded from the dashboard; they carry their own HTML and images. */
  custom?: { html: string; assets: Record<string, Asset>; footer: boolean; archived: boolean; updatedAt: string; createdBy?: string };
};


/* Ordered by group, which is the order the composer shows them in. Subjects
   take the brand's exam name and the brand, for the few that differ. */
const LIFECYCLE: {
  key: string;
  group: string;
  name: string;
  subject: (exam: string, brand: Brand) => string;
  vars: string[];
  sample: Record<string, string>;
  purpose: string;
  suggest?: { preset: string };
  requires?: ("playStoreUrl" | "appStoreUrl")[];
}[] = [
  {
    key: "onboarding-welcome",
    group: "Getting started",
    name: "Welcome",
    subject: () => "Welcome{% if first_name != blank %}, {{first_name}}{% endif %}",
    vars: [],
    sample: {},
    purpose: "Welcome and first steps, for people who just signed up.",
    suggest: { preset: "not_onboarded" },
  },
  {
    key: "onboarding-dropoff",
    group: "Getting started",
    name: "Finish setting up",
    subject: () => "Two minutes to finish setting up",
    vars: [],
    sample: {},
    purpose: "For people who signed up but stopped before onboarding was done.",
    suggest: { preset: "not_onboarded" },
  },
  {
    key: "first-practice",
    group: "Getting started",
    name: "Start with one question",
    subject: () => "Start with one question",
    vars: [],
    sample: {},
    purpose: "For people who finished onboarding but haven't answered anything.",
    suggest: { preset: "no_practice" },
  },
  {
    key: "activation-diagnostic",
    group: "Getting started",
    name: "Diagnostic nudge",
    subject: () => "15 minutes to your readiness score",
    vars: [],
    sample: {},
    purpose: "An earlier take on the same nudge, built around a sample question.",
    suggest: { preset: "no_practice" },
  },
  {
    key: "daily-question",
    group: "Bring them back",
    name: "Daily question",
    subject: (exam) => `{% if streak_days != blank %}Day {{streak_days}}: today's{% else %}Today's{% endif %} ${exam} questions`,
    vars: ["streak_days"],
    sample: { streak_days: "4" },
    purpose: "Three questions to answer from the inbox, for people on a streak.",
    suggest: { preset: "streak" },
  },
  {
    key: "win-back",
    group: "Bring them back",
    name: "Pick up where you left off",
    subject: () => "Pick up where you left off",
    vars: [],
    sample: { questions_answered: "86" },
    purpose: "For people who've gone quiet for a week or more.",
    suggest: { preset: "inactive" },
  },
  {
    key: "exam-countdown",
    group: "Bring them back",
    name: "Exam countdown",
    subject: () => "{% if days_to_exam != blank %}{{ days_to_exam }} days to your exam{% else %}Your exam is coming up{% endif %}",
    vars: [],
    sample: { days_to_exam: "18", test_date: "24 Oct 2026" },
    purpose: "A plan for the last weeks, for people whose exam date is close.",
    suggest: { preset: "exam_soon" },
  },
  {
    key: "plans-nudge",
    group: "Turn into paid",
    name: "What full access adds",
    subject: (_e, brand) => (brand === "nursia" ? "{% if first_name != blank %}{{first_name}}, full{% else %}Full{% endif %} access is 50% off with FLAT50" : "What PrepClever Premium adds"),
    vars: [],
    sample: {},
    purpose: "For people who looked at the plans but didn't start checkout. Nursia's offers 50% off with FLAT50.",
    suggest: { preset: "paywall_no_checkout" },
  },
  {
    key: "checkout-reminder",
    group: "Turn into paid",
    name: "Checkout reminder",
    subject: () => "Your checkout wasn't finished",
    vars: [],
    sample: {},
    purpose: "For people who started paying but stopped. No discount offered.",
    suggest: { preset: "checkout_abandoned" },
  },
  {
    key: "cart-recovery",
    group: "Turn into paid",
    name: "Checkout reminder with 50% off",
    subject: () => "Your Pro plan is saved — 50% off inside",
    vars: ["cart_id", "discount_expiry"],
    sample: { cart_id: "c_8812", discount_expiry: "Sunday, 11:59 PM" },
    purpose: "Offers the FLAT50 code (50% off). Only send it if that code really works at checkout.",
    suggest: { preset: "checkout_abandoned" },
  },
  {
    key: "app-install",
    group: "Get the app",
    name: "Get the Android app",
    subject: (_e, brand) => `{% if first_name != blank %}{{first_name}}, practise{% else %}Practise{% endif %} on your phone with the ${brand === "nursia" ? "Nursia" : "{{ app_name }}"} app`,
    vars: [],
    sample: {},
    purpose: "Points people who haven't used the Android app yet to Google Play. PrepClever people get the app for their exam, or all of them if no exam is set.",
    suggest: { preset: "no_android_app" },
  },
];

const ONBOARDING = [
  ["01-day0-your-plan", "E1 · Your plan (day 0)", "Your first 10 questions are ready", ["exam", "test_date", "daily_target", "benchmark_correct"]],
  ["02-day1-first-question", "E2 · First question (day 1)", "Which client do you assess first?", ["exam"]],
  ["03-day3-your-numbers", "E3 · Your numbers (day 3)", "Where your answers are landing", ["questions_answered", "weakest_topic", "weakest_topic_pct"]],
  ["04-day7-two-steps", "E4 · Two steps (day 7)", "A heparin question that's two steps long", ["exam"]],
  ["05-day14-full-access", "E5 · Full access (day 14)", "What full access adds, and what it costs", ["free_remaining", "questions_answered"]],
] as const;

const ONBOARDING_PURPOSE: Record<string, string> = {
  "01-day0-your-plan": "Day 0. Their plan and first 10 questions.",
  "02-day1-first-question": "Day 1. One question to get them started.",
  "03-day3-your-numbers": "Day 3. How their answers are landing so far.",
  "04-day7-two-steps": "Day 7. A harder question to pull quiet people back.",
  "05-day14-full-access": "Day 14. What full access adds and what it costs.",
};

const ONBOARDING_SAMPLE: Record<string, string> = {
  exam: "NCLEX-RN",
  test_date: "14 Dec 2026",
  daily_target: "25",
  benchmark_correct: "7",
  questions_answered: "86",
  weakest_topic: "Pharmacological therapies",
  weakest_topic_pct: "58",
  free_remaining: "12",
};

export const TEMPLATES: TemplateDef[] = [
  ...(["nursia", "prepclever"] as const).flatMap((brand) =>
    LIFECYCLE.map((t) => ({
      id: `${brand}-${t.key}`,
      brand,
      group: t.group,
      name: t.name,
      subject: t.subject(brand === "nursia" ? "NCLEX" : '{{ exam_short | default: "exam" }}', brand),
      file: `${brand}/${t.key}`,
      quiz: t.key === "daily-question" ? 3 : undefined,
      vars: [...t.vars],
      sample: { ...t.sample },
      purpose: t.purpose,
      suggest: t.suggest,
      requires: t.requires,
    })),
  ),
  {
    id: "nursia-daily-reminder",
    brand: "nursia",
    group: "Habits",
    name: "Daily reminder",
    subject: "{% if first_name != blank %}{{first_name}}, got{% else %}Got{% endif %} ten minutes for NCLEX today?",
    file: "nursia/daily-reminder",
    vars: [],
    sample: {},
    purpose: "A friendly nudge to practise today, with the Android app. Sent every evening by the Nursia daily reminder automation.",
  },
  ...ONBOARDING.map(([file, name, subject, vars]) => ({
    id: `nursia-onboarding-${file.slice(0, 2)}`,
    brand: "nursia" as const,
    group: "Onboarding series",
    name,
    subject,
    file: `onboarding/${file}`,
    vars: [...vars],
    sample: Object.fromEntries(vars.map((v) => [v, ONBOARDING_SAMPLE[v]])),
    purpose: ONBOARDING_PURPOSE[file],
  })),
];

export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id);
}

export const CUSTOM_GROUP = "Your templates";

export function fromCustom(c: CustomTemplate): TemplateDef {
  return {
    id: c.id,
    brand: c.brand,
    group: CUSTOM_GROUP,
    name: c.name,
    subject: c.subject,
    file: "",
    vars: [],
    sample: {},
    purpose: c.purpose,
    custom: { html: c.html, assets: c.assets ?? {}, footer: c.footer, archived: c.archived, updatedAt: c.updatedAt, createdBy: c.createdBy },
  };
}

/** A built-in template, or one uploaded from the dashboard (archived ones too, so old sends still open). */
export async function findTemplate(id: string): Promise<TemplateDef | undefined> {
  const built = getTemplate(id);
  if (built || !id.startsWith("tpl_")) return built;
  const c = await getCustomTemplate(id);
  return c ? fromCustom(c) : undefined;
}

/** Everything the composer can offer: uploaded templates first within each brand. */
export async function allTemplates(includeArchived = false): Promise<TemplateDef[]> {
  const custom = await listCustomTemplates(includeArchived).catch(() => []);
  return [...custom.map(fromCustom), ...TEMPLATES];
}

export function readTemplate(t: TemplateDef) {
  if (t.custom) return { html: t.custom.html, dir: "" };
  const html = TEMPLATE_HTML[t.file];
  if (!html) throw new Error(`Template ${t.file} isn't compiled in; run npm run content`);
  /* Images are referenced relative to the template, e.g. "assets/x.png" -> "nursia/assets/x.png". */
  return { html, dir: t.file.split("/")[0] };
}

/** An image a template points at with a relative path, from wherever that template keeps them. */
export function templateAsset(t: TemplateDef, rel: string): Asset | undefined {
  const clean = rel.replace(/^\.?\//, "");
  if (t.custom) return t.custom.assets[clean] ?? t.custom.assets[clean.split("/").pop() ?? clean];
  return ASSETS[`${readTemplate(t).dir}/${clean}`];
}

/* Filled in by the tool itself for every email, so they never need a fallback. */
const SYSTEM_FIELDS = new Set([
  "email", "unsubscribe_url", "preferences_url", "postal_address", "invite_url", "invite_label",
  "whatsapp_url", "continue_url", "instagram_url", "play_store_url", "app_store_url", "app_url", "user_id",
  "app_name", "prepclever_apps", "exam_app", "pc_app",
]);

/**
 * Every merge field the email reads — in the HTML or the subject, as
 * {{ field }}, {{ field | default: … }} or {% if field … %} — minus the ones the
 * tool supplies. A field whose template already carries a `| default:` is
 * marked, because a blank there already reads fine.
 */
export function fieldsUsed(t: TemplateDef, subject = t.subject) {
  const src = `${readTemplate(t).html}\n${subject}`;
  const found = new Map<string, { hasDefault: boolean }>();
  for (const m of src.matchAll(/\{\{-?\s*([a-z_][a-z0-9_]*)\s*(\|\s*default\b)?/gi)) {
    const prev = found.get(m[1]);
    found.set(m[1], { hasDefault: (prev?.hasDefault ?? false) || !!m[2] });
  }
  /* A field tested with {% if %} is written around when empty, which is as good as a default. */
  for (const m of src.matchAll(/\{%-?\s*(?:if|unless|elsif)\s+([a-z_][a-z0-9_]*)/gi)) found.set(m[1], { hasDefault: true });
  return [...found].filter(([k]) => !SYSTEM_FIELDS.has(k)).map(([name, v]) => ({ name, ...v }));
}
