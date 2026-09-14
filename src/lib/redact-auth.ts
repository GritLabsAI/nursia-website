/**
 * Auth tokens must never reach an analytics store (Growth PRD Finding 01).
 *
 * Supabase delivers a session in the URL fragment — `#access_token=…&refresh_token=…`
 * — and PostHog records URLs verbatim. On app.nursia.io that put 49 live
 * credentials into the project. This site hands sessions *to* the app rather
 * than receiving them, but session replay (NUR-29) and the CAPI route both see
 * URLs, so the same sanitiser runs here: as PostHog's `before_send`, and on
 * every `event_source_url` the route forwards to Meta.
 */

const HAS_TOKEN = /(?:access_token|refresh_token|provider_token|provider_refresh_token|id_token)=/i;
const TOKEN_VALUE = /(access_token|refresh_token|provider_token|provider_refresh_token|id_token)=[^&#\s"']*/gi;

/** Deep enough for a replay page-meta `href`; shallow enough not to walk a DOM snapshot. */
const MAX_DEPTH = 6;

export function redactAuthTokens(value: string): string {
  if (!HAS_TOKEN.test(value)) return value;
  const hash = value.indexOf("#");
  let out = hash >= 0 && HAS_TOKEN.test(value.slice(hash)) ? value.slice(0, hash) : value;
  out = out.replace(TOKEN_VALUE, "$1=[redacted]");
  return out;
}

function redactDeep(value: unknown, depth: number): unknown {
  if (typeof value === "string") return redactAuthTokens(value);
  if (depth <= 0 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const r = redactDeep(v, depth - 1);
      if (r !== v) changed = true;
      return r;
    });
    return changed ? next : value;
  }

  let copy: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const r = redactDeep(v, depth - 1);
    if (r !== v) {
      copy ??= { ...(value as Record<string, unknown>) };
      copy[k] = r;
    }
  }
  return copy ?? value;
}

type RedactableCapture = {
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

/** PostHog `before_send`. Never drops an event; only removes the credential from it. */
export function redactCapture<T extends RedactableCapture>(capture: T | null): T | null {
  if (!capture) return capture;
  return {
    ...capture,
    properties: redactDeep(capture.properties, MAX_DEPTH) as T["properties"],
    ...(capture.$set ? { $set: redactDeep(capture.$set, MAX_DEPTH) as T["$set"] } : {}),
    ...(capture.$set_once ? { $set_once: redactDeep(capture.$set_once, MAX_DEPTH) as T["$set_once"] } : {}),
  };
}
