import type { PageKind } from "./store";

/**
 * The map from what the keyword export calls a thing to what this site calls it.
 *
 * Every planned page has to resolve to a question set that actually exists in
 * `src/lib/content.ts`, because the whole argument of a page here is "read the
 * answer, then go answer twenty questions about it". A page that resolves to
 * nothing is a page that ranks, gets read, and ends — so the planner refuses to
 * create one rather than shipping it pointing at a 404.
 *
 * Two layers, most specific first:
 *
 *   1. the subject in the query itself — "NCLEX review for Lab Values" is a
 *      labs page no matter which bucket the export filed it under
 *   2. the export's own category — the fallback, and correct most of the time
 *
 * Order matters and the first layer exists because the export's categories are
 * coarse in exactly the places that cost the most. "High Yield" holds fifteen
 * different subjects and would otherwise send a pediatrics page to the mixed
 * fundamentals set, which is a worse offer than no link at all.
 */

/** The twenty question sets, as `src/lib/content.ts` spells them. */
export const QUESTION_TOPICS = [
  "pharmacology",
  "med-surg",
  "safe-care",
  "psychosocial",
  "basic-care",
  "risk-reduction",
  "health-promotion",
  "sata",
  "cardiovascular",
  "respiratory",
  "endocrine",
  "neurological",
  "gastrointestinal",
  "renal-genitourinary",
  "maternity-newborn",
  "pediatrics",
  "mental-health",
  "fundamentals",
  "prioritization-delegation",
  "dosage-and-labs",
] as const;

export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

/**
 * Subject phrases found in the query, longest match wins.
 *
 * Keyed by a lowercase substring rather than a token so "lab values" cannot be
 * satisfied by a page that merely says "values", and ordered by length at match
 * time so "fluid and electrolytes" beats "fluid".
 */
const BY_SUBJECT: Record<string, QuestionTopic> = {
  /* management of care, which the export spreads across three categories */
  prioritization: "prioritization-delegation",
  prioritisation: "prioritization-delegation",
  delegation: "prioritization-delegation",
  supervision: "prioritization-delegation",
  triage: "prioritization-delegation",
  "time management": "prioritization-delegation",

  /* labs and numbers */
  "lab values": "dosage-and-labs",
  "laboratory values": "dosage-and-labs",
  "dosage calculation": "dosage-and-labs",
  "dosage calculations": "dosage-and-labs",
  "arterial blood gases": "dosage-and-labs",
  "acid base": "dosage-and-labs",
  "electrolyte imbalances": "dosage-and-labs",
  "fluid and electrolytes": "dosage-and-labs",

  /* body systems named directly */
  cardiac: "cardiovascular",
  "cardiac rhythms": "cardiovascular",
  cardiovascular: "cardiovascular",
  hypertension: "cardiovascular",
  "heart failure": "cardiovascular",
  respiratory: "respiratory",
  copd: "respiratory",
  asthma: "respiratory",
  pneumonia: "respiratory",
  neurological: "neurological",
  stroke: "neurological",
  seizures: "neurological",
  gastrointestinal: "gastrointestinal",
  cirrhosis: "gastrointestinal",
  pancreatitis: "gastrointestinal",
  genitourinary: "renal-genitourinary",
  dialysis: "renal-genitourinary",
  "kidney stones": "renal-genitourinary",
  diabetes: "endocrine",
  dka: "endocrine",
  hypoglycemia: "endocrine",
  insulin: "endocrine",
  endocrine: "endocrine",
  thyroid: "endocrine",

  /* populations */
  "maternal newborn": "maternity-newborn",
  "labor and delivery": "maternity-newborn",
  postpartum: "maternity-newborn",
  pregnancy: "maternity-newborn",
  prenatal: "maternity-newborn",
  pediatric: "pediatrics",
  peds: "pediatrics",
  "child health": "pediatrics",
  "adolescent health": "pediatrics",

  /* psychosocial and mental health, which are two sets here and one in the export */
  "mental health": "mental-health",
  depression: "mental-health",
  "anxiety disorders": "mental-health",
  psychosis: "mental-health",
  "suicide prevention": "mental-health",
  "eating disorders": "mental-health",
  "substance abuse": "mental-health",
  "personality disorders": "mental-health",
  "therapeutic communication": "psychosocial",
  "grief and loss": "psychosocial",
  "coping mechanisms": "psychosocial",
  "cultural awareness": "psychosocial",

  /* safety */
  "infection control": "safe-care",
  "isolation precautions": "safe-care",
  "standard precautions": "safe-care",
  "transmission-based precautions": "safe-care",
  "fall prevention": "safe-care",
  "restraint use": "safe-care",

  /* the whole-category subjects, which the "High Yield" bucket names directly
     and which would otherwise fall through to the fundamentals set — the one
     place the fallback is visibly wrong, because a page titled "Pharmacology
     for the NCLEX" offering a mixed question set is a broken promise */
  pharmacology: "pharmacology",
  "medical surgical": "med-surg",
  "med surg": "med-surg",
  oncology: "med-surg",
  safety: "safe-care",

  /* the strategy pages */
  sata: "sata",
  "select all that apply": "sata",
  "next generation nclex": "fundamentals",
  ngn: "fundamentals",
};

/** The export's own category. The fallback when no subject phrase matched. */
const BY_CATEGORY: Record<string, QuestionTopic> = {
  "Management of Care": "safe-care",
  "Safety and Infection Control": "safe-care",
  "Health Promotion and Maintenance": "health-promotion",
  "Psychosocial Integrity": "psychosocial",
  "Basic Care and Comfort": "basic-care",
  "Pharmacological Therapies": "pharmacology",
  "Reduction of Risk Potential": "risk-reduction",
  "Physiological Adaptation": "med-surg",
  "Cardiovascular System": "cardiovascular",
  "Respiratory System": "respiratory",
  "Neurological System": "neurological",
  "Gastrointestinal System": "gastrointestinal",
  "Genitourinary System": "renal-genitourinary",
  "Endocrine System": "endocrine",
  "Musculoskeletal System": "med-surg",
  "Integumentary System": "med-surg",
  "Immune System": "med-surg",
  "Hematological System": "med-surg",
  "Reproductive System": "maternity-newborn",
  "Sensory System": "med-surg",
  Pharmacology: "pharmacology",
  "Test Taking": "fundamentals",
  "Question Types": "fundamentals",
  "High Yield": "fundamentals",
  "Long Tail": "fundamentals",
};

/**
 * Which question set a query belongs to.
 *
 * Returns null when neither layer knows, which the planner treats as a reason
 * to reject the row rather than a reason to guess. A wrong practice link is
 * worse than a missing page: it is a promise the page makes and breaks.
 */
export function questionTopicFor(
  query: string,
  category: string,
): QuestionTopic | null {
  const q = query.toLowerCase();

  const subject = Object.keys(BY_SUBJECT)
    .filter((phrase) => q.includes(phrase))
    .sort((a, b) => b.length - a.length)[0];
  if (subject) return BY_SUBJECT[subject];

  return BY_CATEGORY[category] ?? null;
}

/**
 * Where the page sits in the reader's journey, using the same four values the
 * guide schema already uses so both document types can be reasoned about in one
 * query.
 *
 * Nearly everything in this export is `content` — it is a study-material export
 * and these are study pages. Test-taking strategy is `during`, because somebody
 * searching "how to answer SATA questions" is thinking about the exam engine
 * rather than about a body system.
 */
export function clusterFor(category: string): "before" | "during" | "content" | "after" {
  if (category === "Test Taking" || category === "Question Types") return "during";
  return "content";
}

/**
 * How the page argues, derived from the export's intent column and the query.
 *
 * This decides the body shape — a practice page leads with how the exam asks
 * the question, a clinical page leads with the assessment that changes the
 * answer, a medication page leads with what kills the patient. It is not a
 * style switch; it is the outline.
 */
export function kindFor(query: string, intent: string, category: string): PageKind {
  const q = query.toLowerCase();
  if (category === "Test Taking" || category === "Question Types") return "strategy";
  if (intent === "strategy" || intent === "tutorial") return "strategy";
  if (intent === "medication" || intent === "education") return "medication";
  if (intent === "clinical") return "clinical";
  if (intent === "practice" || intent === "long_tail") return "practice";
  if (q.includes("questions")) return "practice";
  return "review";
}

/**
 * The slug: the subject, plus what kind of page this is.
 *
 * Built from the *subject* rather than from the winning query, because which
 * phrasing wins is an accident of the volume column. Slugged from the query,
 * the anticoagulants page lands at `/nclex-review/anticoagulants-patient-teaching`
 * — a URL that describes which row of a spreadsheet scored highest, and that
 * would be wrong the moment a later export ranked "side effects" above it. The
 * subject is stable; the phrasing is not, and a slug lives at its URL forever.
 *
 * The word "nclex" is dropped: every query in the export contains it and the
 * route already carries it, so keeping it produces `/nclex-review/nclex-…` on a
 * hundred pages. Review pages take no suffix for the same reason — the route
 * says review — while the other kinds take one, because `/sepsis-nursing-care`
 * and `/sepsis-practice-questions` are genuinely different pages.
 */
export function slugFor(subject: string, kind: PageKind): string {
  const base = subject
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\bnclex\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const suffix = {
    practice: "-practice-questions",
    review: "",
    clinical: "-nursing-care",
    medication: "-nursing-considerations",
    strategy: "-strategy",
  }[kind];

  return `${base}${suffix}`.slice(0, 80).replace(/-$/, "");
}
