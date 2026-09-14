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

import posthog from "posthog-js";

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
  toPostHog(event, clean);
}

/* ------------------------------------------------------------- posthog */

/**
 * Every event also goes to PostHog, the system of record (PostHog install spec
 * PH-11). Because every call on this site funnels through `track`, this one
 * edit sends all of them without touching a call site.
 *
 * PostHog initialises in an effect, and a page's own mount effects (a
 * `guide_viewed`) can run first. Those few are held here rather than lost; the
 * provider flushes them once init has run. Without a PostHog key the provider
 * never mounts and the queue simply stays small and unsent.
 */
const queued: Array<[string, Params]> = [];

function toPostHog(event: string, params: Params) {
  try {
    if (posthog.__loaded) posthog.capture(event, params);
    else if (queued.length < 50) queued.push([event, params]);
  } catch {
    /* analytics must never take a page down with it */
  }
}

export function flushQueuedEvents() {
  if (!posthog.__loaded) return;
  for (const [event, params] of queued.splice(0)) {
    try {
      posthog.capture(event, params);
    } catch {
      /* analytics must never take a page down with it */
    }
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

/**
 * Meta pixel events.
 *
 * The pixel itself is loaded by the root layout; this is the vocabulary on top
 * of it, and the same no-op-when-absent contract as `track` above. The pixel
 * is blocked far more often than GA4 is — Safari, iOS, and every content
 * blocker in the world take a run at it — so a missing `fbq` is the normal
 * case, not an error worth surfacing.
 *
 * Only Meta's STANDARD event names get `track`; anything of our own would need
 * `trackCustom`, and a standard event is what Ads Manager can optimise
 * delivery toward. Hence CompleteRegistration for a signup rather than a
 * prettier name of our own invention.
 *
 * As with GA4, nothing a person typed is sent. Advanced matching — hashing an
 * email into the pixel to recover attribution Safari dropped — is deliberately
 * NOT done here; it would mean shipping user data to Meta from the browser,
 * and it belongs in the Conversions API on the server if it is ever wanted.
 */
function meta(event: string, params: Params = {}, eventId?: string) {
  if (typeof window === "undefined") return;
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  try {
    window.fbq?.("track", event, clean, eventId ? { eventID: eventId } : undefined);
  } catch {
    /* analytics must never take a page down with it */
  }
}

/**
 * One id per conversion, shared by the Pixel call, the server call and the
 * PostHog event (NUR-07). It is what lets Meta collapse the browser and server
 * copies into one conversion — the test DOD-4 runs.
 */
function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * The server half of a Meta conversion (NUR-08, NUR-10). Browser-only events
 * lose what blockers and iOS strip — disproportionately the paid, mobile
 * traffic being bought — and the route recovers it under the same event id.
 * `keepalive` so a click that navigates away still arrives.
 */
function metaServer(event: string, eventId: string, customData: Params = {}) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
  const clean = Object.fromEntries(Object.entries(customData).filter(([, v]) => v !== undefined));
  try {
    void fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: event,
        event_id: eventId,
        event_source_url: window.location.href,
        fbp: readCookie("_fbp"),
        fbc: readCookie("_fbc"),
        fbclid: new URLSearchParams(window.location.search).get("fbclid") ?? undefined,
        custom_data: clean,
      }),
    }).catch(() => {});
  } catch {
    /* analytics must never take a page down with it */
  }
}

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
  /* Meta's mid-funnel signal. Not the conversion the campaign bids toward,
     but enough volume to give delivery something to learn from long before
     signups alone would. Sent by the Pixel and the server under one id (Area B). */
  const lead = { content_name: p.resource, content_category: p.guide };
  meta("Lead", lead, eventId);
  metaServer("Lead", eventId, lead);
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
  const eventId = newEventId();
  track("sign_up", { method, ...funnelParams(context), event_id: eventId });
  /* The campaign's PRIMARY conversion — this is what Google Ads bids toward. */
  adsConversion(process.env.NEXT_PUBLIC_ADS_SIGNUP_LABEL);
  /* Same conversion, told to Meta. CompleteRegistration is the standard event
     Ads Manager offers as an optimisation goal for exactly this. */
  const registration = { registration_method: method, content_name: context.guide };
  meta("CompleteRegistration", registration, eventId);
  metaServer("CompleteRegistration", eventId, registration);
}

export function loggedIn(method: AuthMethod) {
  track("login", { method });
}

/* ----------------------------------------------------------------- login */

/**
 * Login on nursia.io (NUR-28). The completion is recorded by the app, on the
 * callback that receives the session — the one place that knows whether the
 * account is new — so this side records the steps before it: the form was
 * seen, an attempt was made, an attempt failed and why. Same names the app
 * uses, so dashboard tile 6 reads one funnel across both hosts.
 */
export type LoginMode = "login" | "signup";

export function loginViewed(mode: LoginMode) {
  track("login_viewed", { screen_name: "nursia_login", mode });
}

export function loginStarted(method: AuthMethod, mode: LoginMode) {
  track("login_started", { screen_name: "nursia_login", method, mode });
}

export function loginFailed(method: AuthMethod, mode: LoginMode, reason: string) {
  track("login_failed", { screen_name: "nursia_login", method, mode, reason });
}

/** Hand-off to the app with a session: tie this browser's history to the account (identify on the domain holding first touch). */
export function identifyPerson(userId: string) {
  try {
    if (posthog.__loaded) posthog.identify(userId);
  } catch {
    /* analytics must never take a page down with it */
  }
}

/** Area A: which landing page, by its slug. */
export function lpViewed(src: string) {
  track("lp_viewed", { src });
}
