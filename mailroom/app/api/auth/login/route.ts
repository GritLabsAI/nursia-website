import { NextResponse } from "next/server";

/** Starts Google sign-in. The state cookie ties the callback to this browser. */
export function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = new URL(req.url).origin;
  if (!clientId) return NextResponse.redirect(`${origin}/login?error=config`);
  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("mr_oauth_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
