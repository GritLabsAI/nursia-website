import type { NextRequest, NextResponse } from "next/server";
import {
  SIGNAL_KEYS,
  STORED_KEYS,
  cleanLandingPath,
  cleanValue,
  readAttribution,
  type AttributionValues,
  type StoredKey,
} from "./allowlist";

/**
 * `nursia_attr` — the attributed visit(s) that brought someone to Nursia, shared
 * by nursia.io, www.nursia.io and app.nursia.io.
 *
 * Set by the server (here, via /meta and the proxy), readable by the app's
 * JavaScript, which forwards it to the database once the visitor signs in
 * (NCLEX Phase 2C → record_attribution()). A server-set cookie also outlives
 * browser limits on script-written storage.
 *
 * Payload (base64url JSON), same rules as the database:
 *   f  first touch: the earliest valid attributed visit; never replaced by a
 *      later one; dropped after 90 days.
 *   l  last touch: the latest valid attributed visit; dropped after 30 days.
 * A touch holds only allowlisted, validated values plus when (t, ms) and where
 * (landing path, surface) the visit happened. Nothing else is ever written, and
 * anything unexpected in an incoming cookie is discarded on read.
 */

export const ATTRIBUTION_COOKIE = "nursia_attr";
export const ATTRIBUTION_COOKIE_MAX_AGE_S = 90 * 24 * 60 * 60;
export const FIRST_TOUCH_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const LAST_TOUCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Browsers cap a cookie at ~4096 bytes including its attributes. */
const MAX_VALUE_BYTES = 3600;

/** Responses that set or depend on attribution must never be shared by a cache. */
export const NO_STORE = "private, no-store, max-age=0";

const SURFACES = ["nursia_web", "app_web", "app_native"] as const;
export type Surface = (typeof SURFACES)[number];

export type Touch = AttributionValues & {
  t: number;
  surface: Surface;
  landing_path?: string;
};

export type AttributionCookie = { v: 1; f?: Touch; l?: Touch };

/** A touch built from a validated visit. */
export function makeTouch(
  stored: AttributionValues,
  landingPath: string | undefined,
  now: number,
  surface: Surface = "nursia_web",
): Touch {
  const touch: Touch = { ...stored, t: now, surface };
  const path = cleanLandingPath(landingPath);
  if (path) touch.landing_path = path;
  return touch;
}

/** Re-validate a touch read from a cookie; anything unexpected makes it disappear. */
function sanitizeTouch(raw: unknown, maxAgeMs: number, now: number): Touch | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;

  const t = obj.t;
  if (typeof t !== "number" || !Number.isFinite(t)) return undefined;
  if (t > now + CLOCK_SKEW_MS || t < now - maxAgeMs) return undefined;
  if (typeof obj.surface !== "string" || !(SURFACES as readonly string[]).includes(obj.surface)) return undefined;

  const touch: Touch = { t, surface: obj.surface as Surface };
  for (const key of STORED_KEYS) {
    const value = typeof obj[key] === "string" ? cleanValue(key, obj[key] as string) : undefined;
    if (value !== undefined) touch[key] = value;
  }
  const path = typeof obj.landing_path === "string" ? cleanLandingPath(obj.landing_path) : undefined;
  if (path) touch.landing_path = path;

  return SIGNAL_KEYS.some((key) => touch[key] !== undefined) ? touch : undefined;
}

function toBase64Url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

function fromBase64Url(text: string): string {
  return Buffer.from(text, "base64url").toString("utf8");
}

/** Parse an incoming cookie value. Malformed, tampered or expired content yields an empty payload. */
export function decodeAttributionCookie(value: string | undefined, now: number): AttributionCookie {
  if (!value || value.length > 8192) return { v: 1 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(value));
  } catch {
    return { v: 1 };
  }
  if (!parsed || typeof parsed !== "object" || (parsed as { v?: unknown }).v !== 1) return { v: 1 };
  const obj = parsed as { f?: unknown; l?: unknown };
  const out: AttributionCookie = { v: 1 };
  const f = sanitizeTouch(obj.f, FIRST_TOUCH_MAX_AGE_MS, now);
  const l = sanitizeTouch(obj.l, LAST_TOUCH_WINDOW_MS, now);
  if (f) out.f = f;
  if (l) out.l = l;
  // Keep the invariant the database enforces: first never after last.
  if (out.f && out.l && out.f.t > out.l.t) out.f = out.l;
  // The first touch expired but a later one is still valid: that surviving touch
  // is now the earliest valid touch, so it must stay first rather than let the
  // next visit take the slot.
  if (!out.f && out.l) out.f = out.l;
  return out;
}

/** First touch = earliest; last touch = latest. A new visit never overwrites an earlier first touch. */
export function mergeTouch(existing: AttributionCookie, touch: Touch): AttributionCookie {
  const f = !existing.f || touch.t < existing.f.t ? touch : existing.f;
  const l = !existing.l || touch.t >= existing.l.t ? touch : existing.l;
  return { v: 1, f, l };
}

/** Shrink free-text UTMs, then drop them, until the value fits in a cookie. IDs and click IDs are kept. */
function fitTouch(touch: Touch, maxText: number | null): Touch {
  const out: Touch = { ...touch };
  for (const key of ["utm_campaign", "utm_content", "utm_term", "utm_medium", "utm_source"] as StoredKey[]) {
    const value = out[key];
    if (value === undefined) continue;
    if (maxText === null && key !== "utm_source") delete out[key];
    else if (maxText !== null && value.length > maxText) out[key] = value.slice(0, maxText);
  }
  if (maxText === null) delete out.landing_path;
  return out;
}

export function encodeAttributionCookie(payload: AttributionCookie): string {
  const encode = (p: AttributionCookie) => toBase64Url(JSON.stringify(p));
  let value = encode(payload);
  for (const maxText of [96, 32, null]) {
    if (value.length <= MAX_VALUE_BYTES) break;
    value = encode({
      v: 1,
      ...(payload.f ? { f: fitTouch(payload.f, maxText) } : {}),
      ...(payload.l ? { l: fitTouch(payload.l, maxText) } : {}),
    });
  }
  return value;
}

/**
 * `.nursia.io` on the production hosts so every Nursia subdomain shares the
 * cookie; host-only anywhere else (localhost, Railway preview hosts), where a
 * .nursia.io domain would be rejected by the browser.
 */
export function cookieDomainFor(hostname: string): string | undefined {
  const host = hostname.toLowerCase();
  return host === "nursia.io" || host.endsWith(".nursia.io") ? ".nursia.io" : undefined;
}

/**
 * The host the visitor actually asked for. `next start` builds request.nextUrl
 * from its own listening address (e.g. localhost:8080 behind Railway), not from
 * the Host header, so the public host has to come from the proxy headers.
 * A spoofed value only changes the Domain attribute of the caller's own
 * response, which the browser rejects unless it matches the page anyway.
 */
export function requestHostname(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host") || request.nextUrl.host;
  return host.replace(/:\d+$/, "").toLowerCase();
}

/**
 * Record an attributed visit on the response: merge it into `nursia_attr` and mark
 * the response private/no-store. Returns false (and changes nothing) when the
 * request carries no valid attribution signal.
 */
export function applyAttributionCookie(request: NextRequest, response: NextResponse, now = Date.now()): boolean {
  const { stored, hasSignal } = readAttribution(request.nextUrl.searchParams);
  if (!hasSignal) return false;

  const existing = decodeAttributionCookie(request.cookies.get(ATTRIBUTION_COOKIE)?.value, now);
  const merged = mergeTouch(existing, makeTouch(stored, request.nextUrl.pathname, now));

  response.cookies.set({
    name: ATTRIBUTION_COOKIE,
    value: encodeAttributionCookie(merged),
    domain: cookieDomainFor(requestHostname(request)),
    path: "/",
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_S,
    secure: true,
    sameSite: "lax",
    httpOnly: false,
  });
  response.headers.set("Cache-Control", NO_STORE);
  return true;
}
