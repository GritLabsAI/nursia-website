import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-auth";
import { SESSION_COOKIE, allowedEmail, makeSession } from "@/lib/session";

/**
 * The sign-in page signs in with Google through Firebase, then posts the
 * Firebase ID token here. We check it ourselves and, for a verified team
 * address, set Mailroom's own session cookie. Firebase's session isn't kept.
 */
export async function POST(req: Request) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return NextResponse.json({ error: "Firebase sign-in isn't configured" }, { status: 500 });
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: "No token" }, { status: 400 });

  let claims;
  try {
    claims = await verifyFirebaseToken(idToken, projectId);
  } catch (e) {
    return NextResponse.json({ error: `Sign-in couldn't be verified: ${(e as Error).message}` }, { status: 401 });
  }
  const email = String(claims.email ?? "").toLowerCase();
  if (!email || !claims.email_verified || !allowedEmail(email))
    return NextResponse.json({ error: "That Google account isn't on a team domain (gritlabsai.co, nursia.io or prepclever.in). Sign in with your work account." }, { status: 403 });

  const session = await makeSession(email);
  const res = NextResponse.json({ ok: true });
  const secure = new URL(req.url).protocol === "https:";
  res.cookies.set(SESSION_COOKIE, session.value, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.maxAge });
  return res;
}
