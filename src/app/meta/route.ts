import { NextResponse, type NextRequest } from "next/server";
import { APP_LOGIN_URL, withForwardedAttribution } from "@/lib/app-handoff";
import { readAttribution } from "@/lib/attribution/allowlist";
import { NO_STORE, applyAttributionCookie } from "@/lib/attribution/touchCookie";

/**
 * nursia.io/meta — the destination URL for Meta ads.
 *
 * Records the attributed click in `nursia_attr` and sends the visitor straight to
 * the app's login with only the allowlisted attribution parameters. The visitor
 * never renders a nursia.io page here, so this response is the only chance this
 * site has to remember the click.
 *
 * The response is private/no-store: a shared cache must never hand one visitor's
 * Set-Cookie or redirect to another. The destination is fixed.
 */

export const dynamic = "force-dynamic";

function handoff(request: NextRequest): NextResponse {
  const { forwarded } = readAttribution(request.nextUrl.searchParams);
  const response = NextResponse.redirect(withForwardedAttribution(APP_LOGIN_URL, forwarded), 307);
  applyAttributionCookie(request, response);
  response.headers.set("Cache-Control", NO_STORE);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function GET(request: NextRequest): NextResponse {
  return handoff(request);
}

export function HEAD(request: NextRequest): NextResponse {
  return handoff(request);
}
