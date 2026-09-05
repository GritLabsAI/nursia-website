/**
 * GA4 events for the things worth knowing about.
 *
 * The site already loads GA4 in the root layout; this is the vocabulary on top
 * of it. Everything funnels through one `track` so the shape of an event is
 * decided in one place, and so a page never breaks because analytics is
 * blocked — which it often is. An ad blocker, a privacy setting, or simply no
 * GA id in the environment all end the same way here: a no-op.
 *
 * What is deliberately NOT sent: the question stem, the options, or anything a
 * person typed. An item id and whether it was answered correctly is enough to
 * find a broken question; the content is already ours and does not need to
 * make a round trip through Google to be read.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  /* Drop undefined rather than sending the string "undefined" as a dimension. */
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, clean);
    } else if (Array.isArray(window.dataLayer)) {
      /* gtag.js not up yet — the queue is drained when it loads. */
      window.dataLayer.push({ event, ...clean });
    }
  } catch {
    /* analytics must never take a page down with it */
  }
}

/** Where an answer was given. The three surfaces behave differently enough to be worth telling apart. */
export type Surface = "exam" | "drill" | "sample";

export function questionAnswered(p: {
  surface: Surface;
  questionId: string;
  /** blueprint key for the exam, topic slug for a drill */
  topic?: string;
  correct: boolean;
  /** 0-based position within the set */
  index?: number;
  secondsTaken?: number;
}) {
  track("question_answered", {
    surface: p.surface,
    question_id: p.questionId,
    topic: p.topic,
    correct: p.correct,
    /* A count is what GA4 sums in a report; the boolean above is for filtering. */
    correct_count: p.correct ? 1 : 0,
    question_index: p.index,
    seconds_taken: p.secondsTaken,
  });
  /* SECONDARY in Google Ads — recorded, but excluded from bidding. Optimising
     for this would buy people who answer one free question and leave. */
  adsConversion(process.env.NEXT_PUBLIC_ADS_QUESTION_LABEL);
}

export function examStarted(p: { length: number }) {
  track("exam_started", { exam_length: p.length });
}

export function examCompleted(p: {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  expired: boolean;
  minutesTaken: number;
  unanswered: number;
}) {
  track("exam_completed", {
    score_correct: p.correct,
    score_total: p.total,
    score_pct: p.pct,
    passed: p.passed,
    /* Ran out of clock rather than finishing — a different story from a low score. */
    timed_out: p.expired,
    minutes_taken: p.minutesTaken,
    unanswered: p.unanswered,
  });
}

export function drillCompleted(p: { topic: string; correct: number; total: number; pct: number }) {
  track("drill_completed", {
    topic: p.topic,
    score_correct: p.correct,
    score_total: p.total,
    score_pct: p.pct,
  });
}

/* ------------------------------------------------------------------ ads */

/**
 * Google Ads conversions.
 *
 * These ride the SAME gtag.js that GA4 loads — the root layout adds a second
 * `gtag('config', 'AW-…')` alongside the GA4 one. So there is no extra script
 * and no GA4 import step; Google Ads gets its own click-through attribution,
 * which is what the bidding strategy actually reads.
 *
 * The labels are per-conversion-action and come from the account. They are
 * public (they ship to every browser that loads the page), so they live in
 * env for configurability, not for secrecy.
 *
 * Silent no-op when unset, exactly like `track` above: a missing env var must
 * never break a signup.
 */
function adsConversion(sendTo: string | undefined) {
  if (!sendTo || typeof window === "undefined") return;
  try {
    window.gtag?.("event", "conversion", { send_to: sendTo });
  } catch {
    /* analytics must never take a page down with it */
  }
}

/** How the account was made. Google and phone are one flow for both paths. */
export type AuthMethod = "email" | "google" | "phone";

/** GA4 recognises sign_up and login by name and reports on them specially. */
export function signedUp(method: AuthMethod) {
  track("sign_up", { method });
  /* The campaign's PRIMARY conversion — this is what Google Ads bids toward. */
  adsConversion(process.env.NEXT_PUBLIC_ADS_SIGNUP_LABEL);
}

export function loggedIn(method: AuthMethod) {
  track("login", { method });
}
