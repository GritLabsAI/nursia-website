/**
 * The boundary between nursia.io and app.nursia.io.
 *
 * Destinations are fixed constants — never taken from the request — so nothing
 * here can be turned into an open redirect. Only allowlisted, validated
 * attribution parameters are appended (see lib/attribution/allowlist.ts).
 */

export const APP_ORIGIN = "https://app.nursia.io";
export const APP_LOGIN_URL = `${APP_ORIGIN}/login`;

/** `base` with the forwarded attribution appended as its query string. */
export function withForwardedAttribution(base: typeof APP_ORIGIN | typeof APP_LOGIN_URL, forwarded: URLSearchParams): string {
  const query = forwarded.toString();
  return query ? `${base}?${query}` : base;
}
