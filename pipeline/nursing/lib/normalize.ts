/**
 * Turning three thousand keywords into the few hundred pages they represent.
 *
 * A Keyword Planner export is not a list of pages. "nclex questions", "nclex q"
 * and "nclex questionnaire" are three rows with identical volumes because they
 * are one query wearing three spellings, and Google reports them separately
 * because it counts strings. Writing three pages for them produces three pages
 * that compete with each other for one result, which is worse than writing one.
 *
 * So every keyword is reduced to a canonical form — lowercased, stop-worded,
 * synonym-folded, stemmed, sorted — and rows that share one are a cluster with
 * a single page and a single primary query. The rest become the secondary
 * queries that page is also written to answer, which is where the long tail is
 * captured without a page being spent on it.
 *
 * The filter matters as much as the clustering. This account's exports contain
 * CPA, CFA, SAT and USMLE keywords, harvested for other projects from the same
 * Ads account. They have volume, they will score, and a planner that does not
 * exclude them will cheerfully commission forty pages about the CPA exam for a
 * nursing site. Relevance is decided before ranking, never by it.
 */

/** Terms that make a keyword ours. At least one must appear. */
const INCLUDE = [
  "nclex", "nursing", "nurse", "rn", "lpn", "lvn", "pn",
  "nursing student", "registered nurse", "practical nurse",
];

/**
 * Terms that disqualify a keyword outright, whatever else it contains.
 *
 * Two kinds. The first is other exams — the same Ads account researches CPA,
 * CFA, SAT and the USMLE, and those rows are in the same exports. A page about
 * CPA review courses on a nursing site is not a thin page, it is a wrong one.
 *
 * The second is competitor brand names. "uworld nclex" has real volume and
 * there is a legitimate page to write about it, but it is a comparison page
 * that requires actually using the product, and generating one from a keyword
 * and a language model produces a claim about somebody else's software that
 * nobody has checked. That is a different kind of risk from a thin page, so
 * these are excluded here rather than ranked low.
 */
const EXCLUDE = [
  /* other exams, from other projects in the same account */
  "cpa", "cfa", "sat", "act ", " act", "usmle", "mcat", "abim", "pance",
  "panre", "nism", "step 1", "step 2", "step 3", "step1", "step2", "step3",
  "nbme", "amboss", "ccs", "bar exam", "mbe", "becker", "roger", "kaplan",
  "internal medicine board", "physician assistant", "accounting",
  /* competitor brands — a real page, but not one to generate */
  "uworld", "uwsa", "u world", "you world", "archer", "nurseachieve",
  "simplenursing", "picmonic", "bootcamp", "hurst", "saunders", "ati ",
  "mark klimek", "nursing.com", "lecturio", "osmosis",
];

/**
 * Spelling and phrasing variants that mean the same thing.
 *
 * Folded before clustering, which is what makes "questionnaire" and "q" land
 * on the same page as "questions". Deliberately short and explicit: every
 * entry is a judgement that two phrasings share an intent, and a list a person
 * can read is a list a person can correct when one of them is wrong.
 */
const SYNONYMS: Record<string, string> = {
  q: "question",
  qs: "question",
  questionnaire: "question",
  questionaire: "question",
  quiz: "question",
  quizzes: "question",
  qbank: "questionbank",
  qbanks: "questionbank",
  practise: "practice",
  practicing: "practice",
  prep: "preparation",
  preparing: "preparation",
  prepare: "preparation",
  exam: "exam",
  examination: "exam",
  exams: "exam",
  test: "exam",
  tests: "exam",
  testing: "exam",
  rn: "rn",
  "registered nurse": "rn",
  studying: "study",
  studies: "study",
  guides: "guide",
  tips: "tip",
  strategies: "strategy",
  apps: "app",
  application: "app",
  applications: "app",
  courses: "course",
  classes: "course",
  class: "course",
  programs: "program",
  programmes: "program",
  resources: "resource",
  materials: "material",
  books: "book",
  videos: "video",
  free: "free",
  cost: "price",
  costs: "price",
  pricing: "price",
  fee: "price",
  fees: "price",
};

/** Words that carry no distinguishing meaning in this corpus. */
const STOP = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "in", "on", "is", "it",
  "my", "i", "do", "does", "with", "you", "your", "about", "best", "good",
  "top", "new", "all", "are", "be", "at", "by", "from", "that", "this",
  "what", "which", "who", "whom", "s",
]);

/**
 * Question words are kept rather than stopped.
 *
 * "how many questions is the nclex" and "nclex questions" are not the same
 * page, and stopping "how many" collapses them into one. The interrogative is
 * the intent, which is exactly the thing that must survive normalisation.
 */
const QUESTION_WORDS = new Set([
  "how", "why", "when", "where", "can", "should", "many", "long", "much",
  "difference", "vs", "versus",
]);

export type Cluster = {
  /** The highest-volume phrasing, used as the page's primary query. */
  head: string;
  /** Every phrasing that folded into this cluster, head included. */
  members: string[];
  /** Summed distinct volume — see `clusterVolume`. */
  volume: number;
  competition: string | null;
  canonical: string;
};

/**
 * Word boundaries, not substrings.
 *
 * "rn" is in the include list and it is also inside "pattern", "learners" and
 * "concerns", so a substring test admits "pattern questions" — a 1,600-volume
 * keyword about examination patterns in general — to a nursing library. It did,
 * and it looked entirely plausible in the ranked output, which is how a filter
 * bug reaches a thousand published pages without anyone noticing.
 */
const boundary = (term: string) =>
  new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i");

const INCLUDE_RE = INCLUDE.map(boundary);
const EXCLUDE_RE = EXCLUDE.map((t) => boundary(t.trim()));

export function isRelevant(keyword: string): boolean {
  const k = keyword.toLowerCase();
  if (EXCLUDE_RE.some((re) => re.test(k))) return false;
  return INCLUDE_RE.some((re) => re.test(k));
}

/** Lowercase tokens with synonyms folded and plurals stemmed. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t)
    .map((t) => (t.endsWith("s") && t.length > 4 ? t.slice(0, -1) : t))
    .map((t) => SYNONYMS[t] ?? t)
    .filter((t) => QUESTION_WORDS.has(t) || !STOP.has(t));
}

/**
 * The cluster key: sorted unique tokens.
 *
 * Sorting is what makes "nclex practice questions" and "practice questions
 * nclex" one page, which they are — Google returns the same result for both
 * and a reader cannot tell them apart.
 */
export function canonical(keyword: string): string {
  return [...new Set(tokens(keyword))].sort().join(" ");
}

/**
 * Group keywords into pages.
 *
 * Volume is the maximum within a cluster rather than the sum, and that is a
 * deliberate under-count. Google reports the same searches under several
 * phrasings — "nclex questions", "nclex q" and "nclex questionnaire" are all
 * 165,000, and they are not 495,000 searches. Summing produces a number that
 * justifies a page on arithmetic rather than on demand. The max is the honest
 * floor: at least this many people want this page.
 */
export function cluster(
  rows: { keyword: string; volume: number; competition: string }[],
): Cluster[] {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = canonical(row.keyword);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const out: Cluster[] = [];
  for (const [key, list] of groups) {
    /*
     * The head becomes the page's title and primary query, so it has to be the
     * phrasing a person would actually write. Volume alone does not pick it:
     * "nclex questions", "nclex q" and "nclex questionnaire" are all reported
     * at 165,000, and shortest-wins hands the biggest page on the site the
     * title "nclex q". Prefer a phrasing with no abbreviated token, then the
     * shortest of those, which lands on "nclex questions".
     */
    const natural = (k: string) =>
      k.split(/\s+/).every((w) => w.length >= 3 || /^\d+$/.test(w));
    const sorted = [...list].sort(
      (a, b) =>
        b.volume - a.volume ||
        Number(natural(b.keyword)) - Number(natural(a.keyword)) ||
        a.keyword.length - b.keyword.length,
    );
    out.push({
      head: sorted[0].keyword,
      members: sorted.map((r) => r.keyword),
      volume: sorted[0].volume,
      competition: sorted[0].competition ?? null,
      canonical: key,
    });
  }
  return out.sort((a, b) => b.volume - a.volume);
}

/** A URL slug from a phrase. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

/* ------------------------------------------------------------- similarity */

/**
 * IDF-weighted overlap, asymmetric towards the query.
 *
 * Lifted in spirit from stage 2 of the guides pipeline, and for the same
 * reason: nearly every phrase in this corpus contains "nclex", so plain token
 * overlap decides everything covers everything. Weighting by inverse document
 * frequency makes the common token worth nothing and the rare one worth a lot,
 * which is the right way round.
 */
export function buildIdf(docs: Set<string>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) for (const t of doc) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(Math.max(docs.length, 2) / n) + 1);
  return idf;
}

export function similarity(
  query: Set<string>,
  doc: Set<string>,
  idf: Map<string, number>,
): number {
  let shared = 0;
  let total = 0;
  for (const t of query) {
    const w = idf.get(t) ?? Math.log(1000) + 1;
    total += w;
    if (doc.has(t)) shared += w;
  }
  return total === 0 ? 0 : shared / total;
}
