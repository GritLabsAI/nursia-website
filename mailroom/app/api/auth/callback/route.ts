import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, allowedEmail, makeSession } from "@/lib/session";

/**
 * Google sends people back here with a code. We swap it for an ID token over
 * a direct, authenticated call to Google, so the token's contents can be
 * trusted without re-verifying its signature, then check the email is a
 * verified team address.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (why: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${why}`);
    res.cookies.delete("mr_oauth_state");
    return res;
  };
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("mr_oauth_state")?.value) return fail("state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("google");
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  const claims = id_token ? JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8")) : null;
  const email = String(claims?.email ?? "").toLowerCase();
  if (!email || !claims?.email_verified || !allowedEmail(email)) return fail("domain");

  const session = await makeSession(email);
  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(SESSION_COOKIE, session.value, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", path: "/", maxAge: session.maxAge });
  res.cookies.delete("mr_oauth_state");
  return res;
}
