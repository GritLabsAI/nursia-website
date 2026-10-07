import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authDisabled, readSession } from "./lib/session";

/**
 * Everything is behind Google sign-in except what people outside the team
 * have to reach: answer pages and unsubscribe (linked from emails), webhooks
 * from Resend, and background jobs from QStash (those check their own
 * signatures).
 */

const PUBLIC = [/^\/login$/, /^\/api\/auth\//, /^\/q\//, /^\/api\/quiz\//, /^\/unsubscribe$/, /^\/api\/webhooks\//, /^\/api\/cron\//, /^\/api\/jobs\//, /^\/brand\//, /^\/favicon/];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((re) => re.test(path)) || authDisabled()) return NextResponse.next();
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/).*)"] };
