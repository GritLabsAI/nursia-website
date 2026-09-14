/**
 * The boundary between nursia.io and app.nursia.io, and what has to survive it.
 *
 * Signup, practice and the exam moved to the app, and the hop between the two
 * was a bare `redirect()` that threw the query string away — every gclid,
 * fbclid and UTM died one step after the landing page collected it (Growth PRD
 * Finding 02). Everything that sends a visitor across now goes through here.
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nursia.io";

/**
 * Everything the ad platforms and our own funnel need on the far side: the five
 * UTMs, Google's three click ids (gbraid and wbraid arrive instead of gclid on
 * iOS app campaigns — an iOS purchase with only gclid stored is an orphan),
 * Meta's click id, the landing-page slug, and the content-funnel context.
 */
export const CARRY = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "src",
  "guide",
  "resource",
  "experiment",
  "variant",
] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Login lives on this site when it can (NUR-28, PRD P0 requirement 01): the
 * domain that still holds first-touch attribution and the click ids. Until the
 * Supabase keys are configured here the funnel pages fall back to handing the
 * visitor to the app, attribution intact.
 */
export const LOGIN_ON_SITE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function carried(from: SearchParams | URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const key of CARRY) {
    const raw = from instanceof URLSearchParams ? from.get(key) : from[key];
    const one = Array.isArray(raw) ? raw[0] : raw;
    if (one) out.set(key, one);
  }
  return out;
}

/** `base` with the carried parameters appended, preserving any query it already has. */
export function withCarried(base: string, from: SearchParams | URLSearchParams): string {
  const qs = carried(from).toString();
  if (!qs) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${qs}`;
}
