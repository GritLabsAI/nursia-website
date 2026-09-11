/**
 * Website → app login handoff.
 *
 * Nursia's product lives at app.nursia.io, on Supabase. This site's job in the
 * login flow is to *start* the sign-in and then get out of the way: the session
 * belongs to the app, and the browser should arrive there already carrying it.
 *
 * That is why the client below is configured to keep nothing —
 * `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`.
 * A half-session on the marketing origin would be a second source of truth
 * about who someone is, and the two would drift the first time one of them
 * refreshed a token. The website is deliberately incapable of holding one.
 *
 * Two methods, matching what the app itself accepts:
 *
 *   Google  — supabase-js builds /auth/v1/authorize and navigates the whole
 *             page. Google returns straight to the app's callback; this origin
 *             is never revisited, which is why nothing here needs to read a
 *             fragment.
 *   Email   — signs in here, takes the tokens, and hands them to the app in the
 *             URL fragment. The tokens exist in this document for the few
 *             milliseconds between the call returning and the navigation.
 *
 * Phone is deliberately absent. The reference implementation's phone path is
 * 2Factor.in with a hardcoded +91 and Indian DLT registration — wrong for an
 * NCLEX audience, and there are no phone accounts to carry over.
 *
 * Everything is behind NEXT_PUBLIC_AUTH_HANDOFF. With the flag off this module
 * is never called and Firebase remains the only way in.
 */

/** The app that owns the session. Hardcoded, like the reference: the callback
 *  has to be an origin Supabase has allowlisted, so it is not something a
 *  deploy-time variable should be able to point somewhere else. */
const APP_HOST = "https://app.nursia.io";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Feature flag. Off unless explicitly "1", so a missing variable is the old
 *  Firebase behaviour rather than a broken login. */
export function handoffEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_AUTH_HANDOFF === "1" &&
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey)
  );
}

export class HandoffUnavailable extends Error {
  constructor() {
    super("Supabase handoff is not configured");
    this.name = "HandoffUnavailable";
  }
}

type AuthClient = import("@supabase/supabase-js").SupabaseClient;

let clientPromise: Promise<AuthClient> | null = null;

/** Dynamically imported so the Supabase bundle never lands on the public pages
 *  a search engine sent someone to — the same reasoning as auth-hint.ts keeping
 *  Firebase off those pages. */
async function getAuthClient(): Promise<AuthClient> {
  if (!supabaseUrl || !supabaseAnonKey) throw new HandoffUnavailable();
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // The session lives on app.nursia.io, not here. See the file header.
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );
  }
  return clientPromise;
}

/**
 * Attribution carried across the handoff.
 *
 * app.nursia.io's callback already parses a fixed set of keys, so this sends
 * the ones this site can answer honestly and nothing else. There is no UTM
 * cookie or anonymous-id infrastructure here, so those are read from the
 * current URL only — inventing a persistence layer for them is a separate job,
 * not part of wiring up login.
 */
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "gbraid",
  "wbraid",
] as const;

function buildAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  const params = new URLSearchParams(window.location.search);
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  // Which page the person was on when they decided to sign up. Same name the
  // app already reads.
  out.pc_ref = window.location.pathname;
  return out;
}

function callbackUrl(): URL {
  const url = new URL(`${APP_HOST}/auth/callback`);
  for (const [key, value] of Object.entries(buildAttribution())) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

/**
 * Google: hand the whole page to Supabase, which redirects to Google and then
 * on to the app's callback. This function does not return in practice — the
 * navigation happens inside signInWithOAuth.
 */
export async function signInWithGoogleToApp(): Promise<void> {
  const client = await getAuthClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl().toString() },
  });
  if (error) throw error;
}

/**
 * Email + password: authenticate here, then hand the tokens to the app in the
 * fragment. A fragment rather than a query because it is never sent to a
 * server, never written to an access log, and is exactly what the app's
 * callback already expects from the reference implementation.
 */
export async function signInWithEmailToApp(
  email: string,
  password: string,
): Promise<void> {
  const client = await getAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("No session returned");
  redirectToApp(data.session.access_token, data.session.refresh_token);
}

/**
 * Email signup. Returns `false` when Supabase accepted the account but issued
 * no session, which is what email confirmation looks like — the caller tells
 * the person to go and confirm rather than silently doing nothing.
 */
export async function signUpWithEmailToApp(
  email: string,
  password: string,
): Promise<boolean> {
  const client = await getAuthClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) return false;
  redirectToApp(data.session.access_token, data.session.refresh_token);
  return true;
}

function redirectToApp(accessToken: string, refreshToken: string): void {
  const fragment = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  /* Cross-origin by design — app.nursia.io is a different origin, so this
     cannot be a router.push(). The lint rule assumes an internal Next route. */
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${callbackUrl().toString()}#${fragment.toString()}`);
}

/**
 * Prose for a Supabase auth failure.
 *
 * `authMessage()` in firebase.ts reads Firebase's `auth/...` codes, and a
 * Supabase AuthApiError carries none of them — every failure fell through to
 * its default, so a simple wrong password told the candidate "Something went
 * wrong signing you in. Try again in a moment." That is worse than unhelpful:
 * it blames the service for something the person can fix, and invites them to
 * retry the same wrong password forever.
 *
 * Returns "" when the person cancelled, matching the existing convention that
 * an empty string means "say nothing".
 */
export function handoffMessage(error: unknown): string {
  const detail =
    typeof error === "object" && error && "message" in error ? String(error.message) : "";
  const status =
    typeof error === "object" && error && "status" in error ? Number(error.status) : 0;

  if (detail) console.warn("[nursia] supabase auth error:", detail, error);

  if (/invalid login credentials/i.test(detail)) {
    return "That email and password do not match an account.";
  }
  if (/email not confirmed/i.test(detail)) {
    return "Confirm your email address first — check your inbox for the link.";
  }
  if (/user already registered/i.test(detail)) {
    return "There is already an account with that email. Log in instead.";
  }
  if (/password should be at least/i.test(detail)) {
    return "Passwords need at least 8 characters.";
  }
  if (/rate limit|too many requests/i.test(detail) || status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/popup closed|cancelled|canceled/i.test(detail)) return "";
  if (error instanceof HandoffUnavailable) {
    return "Accounts are not switched on yet. Practice questions work without one.";
  }
  return "Something went wrong signing you in. Try again in a moment.";
}

/**
 * Does the browser already hold an app session?
 *
 * Reads the cookie the APP writes on the shared parent domain. The website
 * never writes it: forging it would send someone to an app that bounces them
 * straight back here.
 *
 * NOTE: app.nursia.io does not write this cookie yet — its auth bridge is still
 * scoped to the other brand's domain. Until that ships this returns false for
 * everyone, so nothing should gate real UI on it.
 */
export function hasAppSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("ns_auth=1"));
}
