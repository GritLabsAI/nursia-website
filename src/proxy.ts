import { NextResponse, type NextRequest } from "next/server";
import { applyAttributionCookie } from "@/lib/attribution/touchCookie";

/**
 * Records attributed landings on any page (a Meta or Google ad pointed at a
 * landing page or guide) in the shared `nursia_attr` cookie.
 *
 * The matcher runs this ONLY for page requests that carry an attribution signal
 * in the query string, so ordinary traffic never pays for it. /meta is excluded:
 * its route handler records the visit itself.
 *
 * The matcher must stay a literal (Next analyses it at build time); keep its query
 * keys in step with SIGNAL_KEYS in lib/attribution/allowlist.ts — a test checks.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  applyAttributionCookie(request, response);
  return response;
}

export const config = {
  matcher: [
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "utm_source" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "fbclid" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "gclid" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "gbraid" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "wbraid" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "meta_campaign_id" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "meta_adset_id" }] },
    { source: "/((?!_next/|api/|ingest/|studio|meta$|meta/|.*\\..*).*)", has: [{ type: "query", key: "meta_ad_id" }] },
  ],
};
