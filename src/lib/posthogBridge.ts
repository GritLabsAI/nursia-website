import posthog from "posthog-js";
import { STORED_KEYS, cleanLandingPath, readAttribution } from "@/lib/attribution/allowlist";

/** Every initial_* key initialAttributionProperties() can produce. */
export const INITIAL_KEYS: string[] = [
  ...STORED_KEYS.map((key) => `initial_${key}`),
  "initial_landing_path",
  "initial_touched_at",
];

/**
 * The seam between the site's `track()` and PostHog.
 *
 * `track()` runs from components that can fire before the provider has
 * initialised PostHog (a guide view on first paint), so events that arrive
 * early wait in a small queue and are sent once `PostHogProvider` calls
 * `flushPendingPostHog()`. The queue is capped: a page where PostHog never
 * initialises (no key, blocked) must not accumulate memory.
 */

type Properties = Record<string, string | number | boolean>;

const MAX_PENDING = 50;
const pending: Array<{ event: string; properties: Properties }> = [];

function isLoaded(): boolean {
  return Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
}

export function capturePostHog(event: string, properties: Properties): void {
  try {
    if (isLoaded()) posthog.capture(event, properties);
    else if (pending.length < MAX_PENDING) pending.push({ event, properties });
  } catch {
    /* analytics must never take a page down with it */
  }
}

export function flushPendingPostHog(): void {
  if (!isLoaded()) return;
  for (const { event, properties } of pending.splice(0)) {
    try {
      posthog.capture(event, properties);
    } catch {
      /* analytics must never take a page down with it */
    }
  }
}

/** Test seam. */
export function pendingPostHogEvents(): ReadonlyArray<{ event: string; properties: Properties }> {
  return pending;
}

/**
 * First-touch super properties for a landing URL: the Phase 2 allowlist's
 * validated values (same keys and checks as the `nursia_attr` cookie and the
 * app), prefixed `initial_`, plus the landing path. Only a visit carrying an
 * attribution signal counts as a touch — a direct or organic visit returns
 * nothing, so it can never claim first touch ahead of the ad click that
 * eventually arrives.
 */
export function initialAttributionProperties(
  search: string,
  pathname: string,
  now: number = Date.now(),
): Record<string, string> {
  const { stored, hasSignal } = readAttribution(new URLSearchParams(search));
  if (!hasSignal) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (value) out[`initial_${key}`] = value;
  }
  const path = cleanLandingPath(pathname);
  if (path) out.initial_landing_path = path;
  /* Exactly the key set the app registers (lib/analytics/attributionTouch.ts,
     INITIAL_TOUCH_PROPERTY_KEYS), so its whole-touch rules recognise this first
     touch on the shared .nursia.io PostHog cookie instead of mixing into it. */
  out.initial_touched_at = new Date(now).toISOString();
  return out;
}

/**
 * First touch is written as a whole, once. `register_once` alone works key by
 * key: a later visit from a different channel would add its own keys (say
 * `initial_fbclid`) next to the first visit's (`initial_gclid`), describing a
 * visit that never happened. So nothing is written if any initial_* property
 * is already registered — by this site or by the app on the shared cookie.
 */
export function hasRegisteredInitialTouch(getProperty: (key: string) => unknown, keys: string[] = INITIAL_KEYS): boolean {
  return keys.some((key) => getProperty(key) !== undefined);
}
