/**
 * The attribution allowlist: which query parameters this site may store and pass
 * on to app.nursia.io, and what a valid value looks like.
 *
 * One module for every place attribution crosses a boundary — /meta, the proxy
 * that records attributed landings, the funnel redirects and the landing-page
 * CTAs — so none of them can forward something the others would drop.
 *
 * The validation mirrors public.attribution_clean_touch() in the app's database
 * (NCLEX Phase 2A), so the website never stores a value the database would later
 * reject. Keep the two in step.
 *
 * Attribution is only ever read from the query string. Supabase puts sessions in
 * the URL fragment, which never reaches the server and is never read here.
 */

/** Stored on the touch (cookie) and forwarded to the app. */
export const STORED_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "meta_campaign_id",
  "meta_adset_id",
  "meta_ad_id",
  "meta_site",
  "meta_placement",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "src",
] as const;

/** Funnel context: forwarded so the app can report on it, never stored. */
export const FORWARD_ONLY_KEYS = ["guide", "resource", "experiment", "variant"] as const;

export const FORWARD_KEYS = [...STORED_KEYS, ...FORWARD_ONLY_KEYS] as const;

/** A visit is attributed only if at least one of these survives validation. */
export const SIGNAL_KEYS = [
  "utm_source",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "meta_campaign_id",
  "meta_adset_id",
  "meta_ad_id",
] as const;

export type StoredKey = (typeof STORED_KEYS)[number];
export type ForwardKey = (typeof FORWARD_KEYS)[number];
export type AttributionValues = Partial<Record<StoredKey, string>>;

/** Values carrying an auth credential are refused outright, whatever the key. */
const TOKEN_LIKE = /(access|refresh|provider|provider_refresh|id)_token/i;

/** True if the string contains an ASCII control character (U+0000–U+001F, U+007F). */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

const FREE_TEXT = (v: string) => v.length <= 256 && !hasControlChars(v);
const META_ID = (v: string) => /^[0-9]{5,25}$/.test(v);
const CLICK_ID = (v: string) => v.length <= 512 && /^[A-Za-z0-9._-]+$/.test(v);
const SLUG = (v: string) => /^[A-Za-z0-9._:/-]{1,128}$/.test(v);

const VALIDATORS: Record<ForwardKey, (v: string) => boolean> = {
  utm_source: FREE_TEXT,
  utm_medium: FREE_TEXT,
  utm_campaign: FREE_TEXT,
  utm_content: FREE_TEXT,
  utm_term: FREE_TEXT,
  utm_id: (v) => /^[A-Za-z0-9._-]{1,128}$/.test(v),
  meta_campaign_id: META_ID,
  meta_adset_id: META_ID,
  meta_ad_id: META_ID,
  meta_site: (v) => /^[a-z]{1,12}$/.test(v),
  meta_placement: (v) => /^[a-z0-9_]{1,40}$/.test(v),
  fbclid: CLICK_ID,
  gclid: CLICK_ID,
  gbraid: CLICK_ID,
  wbraid: CLICK_ID,
  src: SLUG,
  guide: SLUG,
  resource: SLUG,
  experiment: SLUG,
  variant: SLUG,
};

/** Sources whose numeric utm_campaign/utm_term/utm_content are Meta IDs. */
const META_SOURCES = new Set(["meta", "facebook", "fb", "instagram", "ig"]);

/** The cleaned value, or undefined if the key isn't allowed or the value fails. */
export function cleanValue(key: string, raw: string | null | undefined): string | undefined {
  if (raw == null || !Object.hasOwn(VALIDATORS, key)) return undefined;
  const value = raw.trim();
  if (!value || TOKEN_LIKE.test(value)) return undefined;
  return VALIDATORS[key as ForwardKey](value) ? value : undefined;
}

/** A request path suitable for storing as the landing page (no query, no fragment). */
export function cleanLandingPath(path: string | null | undefined): string | undefined {
  if (!path || path.length > 512 || TOKEN_LIKE.test(path) || hasControlChars(path)) return undefined;
  return /^\/[^?#\s]*$/.test(path) ? path : undefined;
}

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** A page's `searchParams` record as URLSearchParams, first value of repeated keys. */
export function toSearchParams(record: SearchParamsRecord): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, raw] of Object.entries(record)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string") out.set(key, value);
  }
  return out;
}

type ParamSource = Pick<URLSearchParams, "get">;

export type ReadAttribution = {
  /** Validated stored keys, plus Meta IDs derived from numeric UTMs. */
  stored: AttributionValues;
  /** Only the allowlisted parameters that were present and valid, in allowlist order. */
  forwarded: URLSearchParams;
  /** True when the visit carries at least one attribution signal. */
  hasSignal: boolean;
};

/**
 * Read attribution from a query string. Everything not on the allowlist — tokens,
 * codes, emails, redirect targets, arbitrary noise — is ignored, and repeated keys
 * contribute only their first value.
 */
export function readAttribution(params: ParamSource): ReadAttribution {
  const stored: AttributionValues = {};
  const forwarded = new URLSearchParams();

  for (const key of FORWARD_KEYS) {
    const value = cleanValue(key, params.get(key));
    if (value === undefined) continue;
    forwarded.set(key, value);
    if ((STORED_KEYS as readonly string[]).includes(key)) stored[key as StoredKey] = value;
  }

  // Ads tagged with IDs in the UTMs instead of meta_* parameters: both Ads
  // Manager conventions are supported, as in the database.
  if (META_SOURCES.has((stored.utm_source ?? "").toLowerCase())) {
    const numeric = (v?: string) => (v && META_ID(v) ? v : undefined);
    const derived = {
      meta_campaign_id: stored.meta_campaign_id ?? numeric(stored.utm_campaign),
      meta_adset_id: stored.meta_adset_id ?? numeric(stored.utm_term),
      meta_ad_id: stored.meta_ad_id ?? numeric(stored.utm_content),
    };
    for (const [key, value] of Object.entries(derived)) {
      if (value !== undefined) stored[key as StoredKey] = value;
    }
  }

  const hasSignal = SIGNAL_KEYS.some((key) => stored[key] !== undefined);
  return { stored, forwarded, hasSignal };
}
