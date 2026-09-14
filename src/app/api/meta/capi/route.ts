import { type NextRequest, NextResponse } from "next/server";
import {
  cleanCustomData,
  fbcFromClickId,
  hashEmail,
  hashExternalId,
  hashPhone,
  resolveEventName,
  sendToMeta,
} from "@/lib/meta-capi";
import { redactAuthTokens } from "@/lib/redact-auth";

/**
 * The server half of every Meta conversion (NUR-08, NUR-10, NUR-25).
 *
 * Called same-origin by this site (Lead) and cross-origin by app.nursia.io
 * (CompleteRegistration, and the Activated / HighIntent custom conversions).
 * The caller passes the event id it gave the Pixel, so Meta keeps one of the
 * pair (DOD-4). IP and user agent come from this request, not the body: they
 * are the visitor's only when the visitor's browser made the call.
 *
 * Engineering call E-03 chose to own this route rather than rely only on
 * PostHog's Meta destination, because registration must carry hashed contact
 * details to reach DOD-2's match quality, and those are handled on a server we
 * control. The destination is still worth its spike (NUR-11) for Lead.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ORIGINS = (
  process.env.CAPI_ALLOWED_ORIGINS ?? "https://nursia.io,https://www.nursia.io,https://app.nursia.io"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

type Payload = {
  event_name?: unknown;
  event_id?: unknown;
  event_source_url?: unknown;
  email?: unknown;
  phone?: unknown;
  em?: unknown;
  ph?: unknown;
  external_id?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  fbclid?: unknown;
  custom_data?: unknown;
  /* The older relay contract put commerce fields at the top level. */
  value?: unknown;
  currency?: unknown;
  content_ids?: unknown;
  content_name?: unknown;
  order_id?: unknown;
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers });
  }

  const eventName = resolveEventName(body.event_name);
  const eventId = str(body.event_id);
  const sourceUrl = str(body.event_source_url);
  if (!eventName) {
    return NextResponse.json({ error: "unsupported_event_name" }, { status: 400, headers });
  }
  if (!eventId || eventId.length > 128 || !sourceUrl) {
    return NextResponse.json({ error: "event_id_and_event_source_url_required" }, { status: 400, headers });
  }

  const customData = cleanCustomData({
    value: body.value,
    currency: body.currency,
    content_ids: body.content_ids,
    content_name: body.content_name,
    order_id: body.order_id,
    ...(body.custom_data && typeof body.custom_data === "object" ? body.custom_data : {}),
  });
  /* Meta rejects a Purchase without both; so should we, loudly, rather than let it vanish. */
  if (eventName === "Purchase" && (typeof customData.value !== "number" || !customData.currency)) {
    return NextResponse.json({ error: "purchase_requires_value_and_currency" }, { status: 400, headers });
  }

  const userData: Record<string, string> = {};
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const fbp = str(body.fbp) ?? req.cookies.get("_fbp")?.value;
  const fbc = str(body.fbc) ?? req.cookies.get("_fbc")?.value ?? fbcFromClickId(body.fbclid);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const em = hashEmail(body.email ?? body.em);
  const ph = hashPhone(body.phone ?? body.ph);
  const externalId = hashExternalId(body.external_id);
  if (em) userData.em = em;
  if (ph) userData.ph = ph;
  if (externalId) userData.external_id = externalId;

  try {
    const result = await sendToMeta({
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      /* A callback URL can carry a session in its fragment; Meta never needs it. */
      event_source_url: redactAuthTokens(sourceUrl),
      action_source: "website",
      user_data: userData,
      custom_data: customData,
    });

    if (result.sent) return NextResponse.json({ ok: true }, { headers });
    if ("skipped" in result) {
      /* Not configured yet — a no-op, never a failure the caller has to handle. */
      return NextResponse.json({ ok: false, skipped: result.skipped }, { headers });
    }
    console.error("[meta-capi] rejected", eventName, result.status, result.error);
    return NextResponse.json({ error: "meta_capi_failed" }, { status: 502, headers });
  } catch (err) {
    console.error("[meta-capi] failed", eventName, err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers });
  }
}
