"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { PERSONAL_URL_PARAMS, redactCapture } from "@/lib/analyticsRedaction";
import { INITIAL_KEYS, flushPendingPostHog, hasRegisteredInitialTouch, initialAttributionProperties } from "@/lib/posthogBridge";

/**
 * PostHog on the marketing site.
 *
 * The product app has been sending to this same project for a while; this side
 * has not, which left neither system able to describe a whole customer. Every
 * question worth asking — which channel produces people who actually study,
 * which guide earns an account — spans the two, so both halves have to land in
 * one project against one person.
 *
 * Three decisions worth keeping:
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
 */
export default function PostHogProvider({ token }: { token: string }) {
  useEffect(() => {
    /* Once per page load: React Strict Mode and remounts re-run this effect, and
       a second init would reset the SDK's state. */
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) {
      flushPendingPostHog();
      return;
    }
    posthog.init(token, {
      api_host: "/ingest",
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
      /* Nothing a session token, contact detail or one-time code can reach
         PostHog's storage — every property of every event, the initial URL in
         $set_once and replay page-meta included (analyticsRedaction.ts). */
      before_send: redactCapture,
      /* before_send only sees events. The SDK also keeps the landing URL in
         its own persistence ($initial_person_info) and sends it with the
         /flags request, so the same parameters are masked at the source too.
         This also masks ad click-id VALUES inside PostHog's automatic URL
         properties; attribution is unaffected — the validated initial_* super
         properties below carry the real values. */
      mask_personal_data_properties: true,
      custom_personal_data_properties: [...PERSONAL_URL_PARAMS],
      /* No App Router route uses the fragment; dropping it from captured URLs
         keeps a token-bearing hash out of persistence as well. */
      disable_capture_url_hashes: true,
    });

    initialAttribution();
    /* Events track() fired before init. */
    flushPendingPostHog();
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
 * The whole first touch is registered once — only while no initial_* property
 * exists (see hasRegisteredInitialTouch: `register_once` alone would add a later
 * channel's keys next to the first one's) — as super properties: attached to
 * every later event from this browser, carried through the eventual
 * `$identify`, and costing no person profile in the meantime. `setPersonProperties` would be the obvious alternative and is the
 * wrong one here: under `identified_only` it is either a no-op or it creates
 * the profile we just said we did not want for anonymous readers.
 */
function initialAttribution() {
  try {
    /* The Phase 2 allowlist decides what counts and what a valid value looks
       like (UTMs incl. utm_id, Meta campaign/ad set/ad ids, gclid, gbraid,
       wbraid, fbclid, src) — the same rules as the nursia_attr cookie and the
       app, so the three never disagree about a visit. */
    const initial = initialAttributionProperties(window.location.search, window.location.pathname);
    if (Object.keys(initial).length === 0) return;
    if (hasRegisteredInitialTouch((key) => posthog.get_property(key), INITIAL_KEYS)) return;
    posthog.register(initial);
  } catch {
    /* analytics must never take a page down with it */
  }
}
