/**
 * IDF-weighted token overlap, for deciding whether the library already answers
 * a query.
 *
 * This mirrors the matcher in `pipeline/02-research.ts` rather than importing
 * it, and the duplication is deliberate: those helpers are private to a stage
 * that can only be re-run against a live Trends session, so pulling them into a
 * shared module means editing code that cannot be exercised here. The two
 * copies answer different questions — that one asks "has a guide already been
 * written about this", this one also has to ask "have I already planned a page
 * about this in the same run" — and they are free to drift.
 *
 * Weighting by inverse document frequency is the whole trick. Nearly every
 * query in this export contains "nclex", and several hundred contain
 * "questions"; plain overlap therefore decides that everything covers
 * everything. IDF makes those tokens worth almost nothing and "cholecystitis"
 * worth a great deal.
 */

const STOP = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "in", "on", "is", "it",
  "my", "i", "do", "does", "how", "what", "when", "where", "why", "can",
  "should", "with", "you", "your", "about", "complete", "guide",
]);

/**
 * The abbreviations this field actually uses, expanded before matching.
 *
 * Token overlap cannot know that MI and "myocardial infarction" are the same
 * thing, and in this export both spellings appear — as do DKA, AKI, CKD and a
 * dozen more. Without the list, a page planned as "MI nursing care" and one
 * planned as "myocardial infarction practice questions" look like different
 * subjects and both get written.
 *
 * Explicit and auditable rather than clever. Add to it whenever a rejection or
 * a collision looks wrong.
 */
const ALIASES: Record<string, string[]> = {
  sata: ["select", "all", "that", "apply"],
  ngn: ["next", "generation"],
  mi: ["myocardial", "infarction"],
  chf: ["heart", "failure"],
  dka: ["diabetic", "ketoacidosi"],
  aki: ["acute", "kidney", "injury"],
  ckd: ["chronic", "kidney", "disease"],
  copd: ["chronic", "obstructive", "pulmonary"],
  dvt: ["deep", "vein", "thrombosi"],
  pe: ["pulmonary", "embolism"],
  tb: ["tuberculosi"],
  tbi: ["traumatic", "brain", "injury"],
  icp: ["intracranial", "pressure"],
  gerd: ["reflux"],
  ibd: ["inflammatory", "bowel"],
  bph: ["prostatic", "hyperplasia"],
  uti: ["urinary", "tract", "infection"],
  ards: ["respiratory", "distress"],
  ppe: ["protective", "equipment"],
  adl: ["activitie", "daily", "living"],
  ecg: ["ekg", "electrocardiogram"],
  abg: ["arterial", "blood", "ga"],
  iv: ["intravenou"],
  ob: ["obstetric", "maternal", "newborn"],
  ped: ["pediatric"],
  psych: ["psychiatric", "mental", "health"],
  "med": ["medical"],
  surg: ["surgical"],
};

/** Lowercase word tokens, minus the noise, plurals crudely stemmed. */
export function tokenSet(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    /* Plurals only. Enough to match "precaution" to "precautions" without a
       stemmer that would also turn "dosage" into "dosag". */
    .map((t) => (t.endsWith("s") && t.length > 4 ? t.slice(0, -1) : t));

  const out = new Set(tokens);
  for (const token of tokens) {
    for (const word of ALIASES[token] ?? []) {
      if (!STOP.has(word)) out.add(word);
    }
  }
  return out;
}

export function buildIdf(docs: Set<string>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const token of doc) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log(docs.length / count) + 1);
  }
  return idf;
}

/**
 * How much of the query's meaning this document already carries.
 *
 * Asymmetric on purpose — the denominator is the query's weight, not the union.
 * The question is "does this page answer the query", and a long page that
 * happens to cover a short query should score high rather than be punished for
 * also covering other things.
 */
export function similarity(
  query: Set<string>,
  doc: Set<string>,
  idf: Map<string, number>,
): number {
  let shared = 0;
  let total = 0;
  for (const token of query) {
    /* A token the library has never seen is maximally informative — exactly
       the kind of gap worth publishing into. */
    const weight = idf.get(token) ?? Math.log(1000) + 1;
    total += weight;
    if (doc.has(token)) shared += weight;
  }
  return total === 0 ? 0 : shared / total;
}
