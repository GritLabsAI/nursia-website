/**
 * What must never be stored by an analytics tool, removed before it leaves the
 * browser.
 *
 * Same rules as the app (app.nursia.io, lib/analytics/redactAuthTokens.ts), so
 * one PostHog project holds neither half's credentials:
 *
 * - **Session credentials.** Supabase sessions travel in URL fragments
 *   (`#access_token=…&refresh_token=…&provider_token=…`). Once a fragment
 *   carries one, the whole fragment goes; anywhere else the key stays and the
 *   value is replaced. (Growth PRD NUR-00 / DOD-6.)
 * - **Contact details and one-time codes** that can arrive as URL parameters on
 *   a crafted or third-party link — an email campaign's `?email=`, a pasted OTP
 *   link. Only a real parameter position counts (`?email=`, `&code=`, `#otp=`),
 *   so `exam_code=` or free text are left alone.
 *
 * Applied to every property of every PostHog event via `before_send`, rather
 * than to a list of the URL properties known today.
 */

/** URL parameters PostHog's own URL masking must cover (see PostHogProvider). */
export const PERSONAL_URL_PARAMS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "id_token",
  "email",
  "phone",
  "code",
  "token_hash",
  "otp",
  "password",
] as const;

const TOKEN_KEYS = "access_token|refresh_token|provider_token|provider_refresh_token|id_token";
const HAS_TOKEN = new RegExp(`(?:${TOKEN_KEYS})=`, "i");
const TOKEN_VALUE = new RegExp(`(${TOKEN_KEYS})=[^&#\\s"']*`, "gi");

const SENSITIVE_PARAM_KEYS = "email|phone|code|token_hash|otp|password";
const HAS_SENSITIVE_PARAM = new RegExp(`[?&#](?:${SENSITIVE_PARAM_KEYS})=`, "i");
const SENSITIVE_PARAM_VALUE = new RegExp(`([?&#])(${SENSITIVE_PARAM_KEYS})=(?!\\[redacted\\])[^&#\\s"']*`, "gi");

/** Deep enough for replay page-meta (`$snapshot_data[n].data.href`); shallow enough not to walk a DOM snapshot. */
const MAX_DEPTH = 6;

export function redactAnalyticsString(value: string): string {
  const hasToken = HAS_TOKEN.test(value);
  if (!hasToken && !HAS_SENSITIVE_PARAM.test(value)) return value;
  let out = value;
  if (hasToken) {
    const hash = out.indexOf("#");
    if (hash >= 0 && HAS_TOKEN.test(out.slice(hash))) out = out.slice(0, hash);
    out = out.replace(TOKEN_VALUE, "$1=[redacted]");
  }
  return out.replace(SENSITIVE_PARAM_VALUE, "$1$2=[redacted]");
}

/** Returns the same reference when nothing changed, so untouched payloads aren't copied. */
export function redactDeep<T>(value: T, depth = MAX_DEPTH): T {
  if (typeof value === "string") return redactAnalyticsString(value) as T;
  if (depth <= 0 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const r = redactDeep(v, depth - 1);
      if (r !== v) changed = true;
      return r;
    });
    return (changed ? next : value) as T;
  }

  let copy: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const r = redactDeep(v, depth - 1);
    if (r !== v) {
      copy ??= { ...(value as Record<string, unknown>) };
      copy[k] = r;
    }
  }
  return (copy ?? value) as T;
}

type RedactableCapture = {
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

/** PostHog `before_send`. Never drops an event — it only removes what must not be stored. */
export function redactCapture<T extends RedactableCapture>(capture: T | null): T | null {
  if (!capture) return capture;
  return {
    ...capture,
    properties: redactDeep(capture.properties),
    ...(capture.$set ? { $set: redactDeep(capture.$set) } : {}),
    ...(capture.$set_once ? { $set_once: redactDeep(capture.$set_once) } : {}),
  };
}
