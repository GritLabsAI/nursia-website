/**
 * The signed-in session: a cookie holding the person's email and an expiry,
 * signed with APP_SECRET. Web Crypto rather than node:crypto so the same code
 * runs in proxy.ts and in route handlers.
 */

export const SESSION_COOKIE = "mr_session";
const DAYS = 30;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function key() {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET is not set");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function makeSession(email: string) {
  const body = b64url(enc.encode(JSON.stringify({ e: email, x: Date.now() + DAYS * 86400_000 })));
  const sig = b64url(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return { value: `${body}.${sig}`, maxAge: DAYS * 86400 };
}

export async function readSession(value: string | undefined): Promise<{ email: string } | null> {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return p.x > Date.now() ? { email: p.e } : null;
  } catch {
    return null;
  }
}

export function allowedEmail(email: string) {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "gritlabsai.co,nursia.io,prepclever.in").split(",").map((d) => d.trim().toLowerCase());
  return domains.includes(email.split("@")[1]?.toLowerCase() ?? "");
}

/** Locally, before Google is configured, the dashboard is open; online it never is. */
export const authDisabled = () => !process.env.VERCEL && !process.env.GOOGLE_CLIENT_ID && !process.env.FIREBASE_PROJECT_ID;
