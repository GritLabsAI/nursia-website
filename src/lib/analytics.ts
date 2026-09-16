/**
 * GA4 + PostHog events for the things worth knowing about.
 *
 * The site already loads GA4 and PostHog in the root layout; this is the
 * vocabulary on top of them. Everything funnels through one `track` so the
 * shape of an event is decided in one place — and so one edit sends every
 * event to both (NUR-05 / PH-11) — and so a page never breaks because
 * analytics is blocked — which it often is. An ad blocker, a privacy setting,
 * or simply no id in the environment all end the same way here: a no-op.
 *
 * What is deliberately NOT sent: the question stem, the options, or anything a
 * person typed. An item id and whether it was answered correctly is enough to
 * find a broken question; the content is already ours and does not need to
 * make a round trip through Google to be read.
 */

import { capturePostHog } from "@/lib/posthogBridge";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (command: string, ...args: unknown[]) => void;
  }
}

function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  /* Drop undefined rather than sending the string "undefined" as a dimension. */
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<
    string,
    string | number | boolean
  >;
  /* PostHog is the system of record for the funnel; GA4 keeps its reports. */
  capturePostHog(event, clean);
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

/* ------------------------------------------------------------------ meta */

/*
 * No Meta events are sent from this file.
 *
 * Meta receives STANDARD events only, and each one is fired where it can be
 * trusted: `PageView` and `ViewContent` by the pixel component
 * (components/MetaPixel.tsx), and every conversion — `Lead`,
 * `CompleteRegistration`, `InitiateCheckout`, `Purchase` — by app.nursia.io's
 * Supabase edge functions, which build the match data server-side and own the
 * exactly-once claims. A site-side `meta()` helper existed here and sent `Lead`
 * on a guide download; it has been removed rather than left to be reused.
 */

/* ---------------------------------------------------------------- funnel */

/**
 * The content funnel, one event per step.
 *
 * The steps exist because "signups went up" is not a finding you can act on.
 * Four things have to be true before a reader of a guide becomes an account,
 * and each one fails differently:
 *
 *   guide_viewed        they arrived
 *   resource_offered    the offer was actually seen, not merely present
 *   resource_clicked    the offer was worth a click
 *   sign_up             the form did not lose them
 *   resource_unlocked   they got the thing they were promised
 *
 * Measuring only the ends tells you the rate moved. Measuring each step tells
 * you whether the offer is wrong, the copy is wrong, or the signup form is
 * broken — three problems with nothing in common except the number they move.
 *
 * `resource_offered` fires on visibility rather than on render, which is the
 * distinction that makes the gate_placement experiment answerable at all: a
 * call to action at the end of a 2,000-word guide is *rendered* for everyone
 * and *seen* by the people who read to the end, and those are wildly
 * different denominators.
 */

/** Carried on every funnel event so any step can be cut by page or by arm. */
export type FunnelContext = {
  /** slug of the guide the reader is on */
  guide?: string;
  /** slug of the free resource being offered */
  resource?: string;
  /** experiment key, when one is running on this page */
  experiment?: string;
  /** which arm this browser is in */
  variant?: string;
  /**
   * Which library the reader is in — a hand-written guide, a review page from
   * the keyword programme, or a nursing library page from the clinical index.
   *
   * Both carry the same offer, so without this the two are indistinguishable in
   * the funnel and "do the review pages convert as well as the guides" cannot
   * be asked at all. `guide_slug` alone cannot answer it: the slugs come from
   * different namespaces and nothing in GA4 knows which is which.
   *
   * Sent as `page_type` rather than `surface`, because `surface` is already a
   * parameter on the question events with an unrelated set of values, and two
   * meanings of one parameter name is how a report quietly stops meaning
   * anything.
   */
  library?: "guide" | "review" | "nursing";
};

function funnelParams(c: FunnelContext): Params {
  return {
    guide_slug: c.guide,
    resource_slug: c.resource,
    experiment: c.experiment,
    variant: c.variant,
    page_type: c.library ?? "guide",
  };
}

export function guideViewed(
  p: FunnelContext & { cluster?: string; topic?: string },
) {
  track("guide_viewed", {
    ...funnelParams(p),
    cluster: p.cluster,
    topic: p.topic,
  });
}

/**
 * The gate came into view.
 *
 * This doubles as the experiment exposure event, and it also sets the variant
 * as a GA4 user property. The user property is what makes the analysis simple:
 * with it set, every later event from this browser — including the `sign_up`
 * that happens two pages away on /signup — can be segmented by arm without
 * anyone having to thread the variant through the whole funnel by hand.
 */
export function resourceOffered(p: FunnelContext & { placement?: string }) {
  track("resource_offered", { ...funnelParams(p), placement: p.placement });

  if (p.experiment && p.variant && typeof window !== "undefined") {
    try {
      window.gtag?.("set", "user_properties", {
        [`exp_${p.experiment}`]: p.variant,
      });
    } catch {
      /* analytics must never take a page down with it */
    }
  }
}

export function resourceClicked(p: FunnelContext & { placement?: string }) {
  const eventId = newEventId();
  track("resource_clicked", { ...funnelParams(p), placement: p.placement, event_id: eventId });
  /* Nothing goes to Meta here. This used to send `Lead`, but Lead now means an
     account was created (app.nursia.io, registration-conversion): downloading a
     guide is not an account, and sending both teaches delivery the wrong thing.
     The click stays a content-funnel event in GA4 and PostHog. */
}

/** One id per occurrence, shared by GA4/PostHog `event_id` and the Pixel `eventID`. */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The reader got the thing.
 *
 * Fired on the resource page once there is a session, which makes it the only
 * step that confirms the promise was actually kept. A funnel that stops
 * counting at `sign_up` cannot tell the difference between a working flow and
 * one that creates accounts and then loses people on the way back.
 */
export function resourceUnlocked(p: FunnelContext & { kind?: string }) {
  track("resource_unlocked", { ...funnelParams(p), resource_kind: p.kind });
}

/** How the account was made. Google and phone are one flow for both paths. */
export type AuthMethod = "email" | "google" | "phone";

/**
 * GA4 recognises sign_up and login by name and reports on them specially.
 *
 * The funnel context is optional and comes from the signup page's query
 * string, which is how a signup that started on a guide stays attributable to
 * that guide. Without it every account looks like it arrived at /signup from
 * nowhere, and the question the whole content programme exists to answer —
 * which pages produce accounts — has no data behind it.
 */
export function signedUp(method: AuthMethod, context: FunnelContext = {}) {
  track("sign_up", { method, ...funnelParams(context) });
  /* The campaign's PRIMARY conversion — this is what Google Ads bids toward. */
  adsConversion(process.env.NEXT_PUBLIC_ADS_SIGNUP_LABEL);
  /* Meta is told by the app, not here: an account is created on app.nursia.io,
     where the server claims it once per user and sends `Lead` with
     lead_<user_id> (CAPI + Pixel). CompleteRegistration now means onboarding was
     finished, which this site never sees. */
}

export function loggedIn(method: AuthMethod) {
  track("login", { method });
}
