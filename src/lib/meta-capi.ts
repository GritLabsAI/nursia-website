import { createHash } from "node:crypto";

/**
 * Meta Conversions API, server side (NUR-08, NUR-09).
 *
 * Browser-only conversions lose everything an ad blocker or iOS strips — and
 * that loss is not random: it concentrates in paid, mobile traffic, the
 * segment every channel comparison depends on. The same conversion sent from
 * here, under the Pixel's event id, recovers it without double counting.
 *
 * Match quality (DOD-2, target 7.5) is driven by hashed email and phone, the
 * external id, `_fbc`, `_fbp`, IP and user agent. Contact details arrive here
 * raw over HTTPS and are normalised and hashed only here — the PRD's rule is
 * "hash server-side only", and one implementation cannot drift from another.
 */

/** Standard events Ads Manager can optimise toward, plus the two custom conversions. */
const EVENT_NAMES = new Set([
  "Lead",
  "CompleteRegistration",
  "InitiateCheckout",
  "Purchase",
  "Activated",
  "HighIntent",
]);

/** Names older callers used (the PrepClever relay's contract), mapped to Meta's. */
const LEGACY_EVENT_NAMES: Record<string, string> = {
  signup_completed: "CompleteRegistration",
  registration_completed: "CompleteRegistration",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  activated: "Activated",
  practice_session_completed: "HighIntent",
};

export function resolveEventName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (EVENT_NAMES.has(raw)) return raw;
  return LEGACY_EVENT_NAMES[raw] ?? null;
}

const HEX64 = /^[a-f0-9]{64}$/;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Meta: trimmed, lowercased. An already-hashed value passes through untouched. */
export function hashEmail(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (HEX64.test(v)) return v;
  return v.includes("@") ? sha256(v) : undefined;
}

/** Meta: digits only, country code included, no leading plus. */
export function hashPhone(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (HEX64.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 ? sha256(digits) : undefined;
}

/** The canonical user id (engineering call E-02: Supabase's). Hashed like any other identifier. */
export function hashExternalId(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  return HEX64.test(v) ? v : sha256(v);
}

/** Meta's documented `_fbc` format, for a click id that arrived without the cookie. */
export function fbcFromClickId(fbclid: unknown, now = Date.now()): string | undefined {
  return typeof fbclid === "string" && fbclid ? `fb.1.${now}.${fbclid}` : undefined;
}

const CURRENCY = /^[A-Z]{3}$/;

/** Only the fields Meta reads, typed as Meta expects them. Anything else a caller sends is dropped. */
export function cleanCustomData(input: unknown): Record<string, unknown> {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  if (typeof src.value === "number" && Number.isFinite(src.value)) out.value = src.value;
  if (typeof src.currency === "string" && CURRENCY.test(src.currency.toUpperCase())) {
    out.currency = src.currency.toUpperCase();
  }
  for (const key of ["content_name", "content_category", "content_type", "order_id", "registration_method"]) {
    if (typeof src[key] === "string" && src[key]) out[key] = src[key];
  }
  if (Array.isArray(src.content_ids)) {
    out.content_ids = src.content_ids.filter((v): v is string => typeof v === "string").slice(0, 20);
  }
  if (typeof src.num_items === "number") out.num_items = src.num_items;
  return out;
}

export type ServerEvent = {
  event_name: string;
  event_id: string;
  event_time: number;
  event_source_url: string;
  action_source: "website";
  user_data: Record<string, string>;
  custom_data: Record<string, unknown>;
};

/**
 * Nursia's dataset ("NCLEX META SignUp"). The default, not a hard-code: the
 * browser Pixel on both nursia.io and app.nursia.io reports here, and a server
 * event sent to any other dataset can never deduplicate against it.
 */
const NURSIA_META_PIXEL_ID = "1446506794201326";

export type SendResult =
  | { sent: true }
  | { sent: false; skipped: "capi_not_configured" }
  | { sent: false; status: number; error: string };

export async function sendToMeta(event: ServerEvent): Promise<SendResult> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || NURSIA_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return { sent: false, skipped: "capi_not_configured" };

  const testEventCode = process.env.META_TEST_EVENT_CODE;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    },
  );
  if (res.ok) return { sent: true };
  return { sent: false, status: res.status, error: (await res.text()).slice(0, 500) };
}
