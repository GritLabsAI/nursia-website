"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { flushQueuedEvents } from "@/lib/analytics";
import { redactCapture } from "@/lib/redact-auth";

/**
 * PostHog on the marketing site.
 *
 * The product app has been sending to this same project for a while; this side
 * has not, which left neither system able to describe a whole customer. Every
 * question worth asking — which channel produces people who actually study,
 * which guide earns an account — spans the two, so both halves have to land in
 * one project against one person.
 *
 * Decisions worth keeping:
 *
 * **Same-origin.** `api_host` points at our own `/ingest`, which `next.config.ts`
 * rewrites onward. A third-party analytics host is blocked far more often on
 * paid and mobile traffic than on organic desktop, and a dashboard built to
 * compare those two cannot afford a measurement gap that follows the same split
 * as the thing being measured.
 *
 * **`history_change`, not a router effect.** The SDK watches the History API
 * itself, so App Router navigations produce a pageview without this component
 * subscribing to anything. The hand-rolled version — `usePathname` in an effect
 * — double-fires on the first render and misses `replaceState`.
 *
 * **Identified only.** Anonymous readers do not get a person profile. Most
 * traffic here never signs up, and a profile for every browser that reads one
 * guide costs money and buys nothing. The profile is created when the app
 * identifies them, and `initialAttribution` below makes sure the channel that
 * brought them is still attached when that happens.
 *
 * **One person across the boundary** (engineering call E-01). The cookie is
 * scoped to `.nursia.io`, and app.nursia.io sets the same, so the visitor who
 * clicked an ad here and the account created there share a distinct id before
 * anyone calls identify.
 *
 * **Replay, sampled** (NUR-29). The funnel says Meta traffic drops at the gate;
 * a replay says whether they scrolled past it, tapped and bounced, or never saw
 * it. Clarity cannot be filtered by channel or joined to a person, which is the
 * whole question. Sampled rather than 100%, and behind the same token sanitiser
 * the app runs (NUR-00).
 */

const REPLAY_SAMPLE_RATE = (() => {
  const n = Number(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.25;
})();

export default function PostHogProvider({ token }: { token: string }) {
  useEffect(() => {
    if (!posthog.__loaded) {
      posthog.init(token, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
        /* Where "open in PostHog" links point. Without it the toolbar and replay
           links resolve against the proxy path and 404. */
        ui_host: "https://us.posthog.com",
        defaults: "2026-08-30",
        capture_pageview: "history_change",
        capture_pageleave: true,
        person_profiles: "identified_only",
        /* Core Web Vitals from real sessions. The performance budget in the PRD
           is enforced against this rather than against a Lighthouse run, because
           a lab number cannot tell you what a nurse on hospital wifi sees. */
        capture_performance: { web_vitals: true },
        cross_subdomain_cookie: true,
        disable_session_recording: false,
        session_recording: { sampleRate: REPLAY_SAMPLE_RATE },
        before_send: redactCapture,
      });
      initialAttribution();
    }
    flushQueuedEvents();
  }, [token]);

  return null;
}

/**
 * The channel that brought someone, recorded once and never overwritten.
 *
 * PostHog sets its own `$initial_*` properties, and they are not enough on
 * their own: a reader who arrives from an ad, leaves, and comes back a week
 * later through a Google search has a first touch this browser already forgot
 * unless it was written down. More pointedly, activation happens days and
 * several sessions after the click that paid for it, and person-on-events
 * stamps property values as they were at ingestion — so a channel written once
 * at first touch stays readable on every later event, including that one.
 *
 * `register_once` is doing the real work. It writes only if the property is
 * absent, which makes "first touch wins" true at the storage layer rather than
 * something this function has to remember to enforce, and it stores them as
 * super properties — attached to every later event from this browser, carried
 * through the eventual `$identify`, and costing no person profile in the
 * meantime. `setPersonProperties` would be the obvious alternative and is the
 * wrong one here: under `identified_only` it is either a no-op or it creates
 * the profile we just said we did not want for anonymous readers.
 */
const ATTRIBUTION = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  /* Google's click ids. gclid is the web one; gbraid and wbraid arrive instead
     on iOS app campaigns, and a purchase that only stored gclid is an orphan. */
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  /* Ours — which landing page, so creative clusters stay separable. */
  "src",
] as const;

function initialAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const initial: Record<string, string> = {};

    for (const key of ATTRIBUTION) {
      const value = params.get(key);
      if (value) initial[`initial_${key}`] = value;
    }

    if (Object.keys(initial).length === 0) return;

    initial.initial_landing_path = window.location.pathname;
    posthog.register_once(initial, undefined);
  } catch {
    /* analytics must never take a page down with it */
  }
}
