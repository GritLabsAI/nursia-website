"use client";

import type { FunctionsHttpError, SupabaseClient } from "@supabase/supabase-js";
import { APP_URL } from "@/lib/app-handoff";

/**
 * Browser-side Supabase auth for nursia.io (NUR-28).
 *
 * Login belongs here rather than on app.nursia.io because this is the domain
 * that still holds first-touch attribution, the `_fbc` cookie and the click ids
 * (Growth PRD, P0 requirement 01). The site keeps no session of its own: it
 * authenticates the visitor and hands the tokens to the app's /auth/callback,
 * which already consumes `#access_token=…&refresh_token=…` — the same shape
 * Supabase's implicit OAuth flow produces. Attribution rides as a query string
 * ahead of the fragment, which the callback reads before anything else.
 *
 * Phone OTP goes through the app's 2Factor.in edge functions (send-phone-otp /
 * verify-phone-otp), the same stack app.nursia.io uses — India numbers only.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const CALLBACK_URL = `${APP_URL}/auth/callback`;

// `@supabase/supabase-js` is dynamic-import()ed so it stays out of every other
// page's bundle; it loads on the first auth action.
let clientPromise: Promise<SupabaseClient> | null = null;

function getAuthClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // The session lives on app.nursia.io, not here.
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          // Tokens, not a PKCE code: a code can only be exchanged by the origin
          // that holds its verifier, and the exchange happens on the app.
          flowType: "implicit",
        },
      }),
    );
  }
  return clientPromise;
}

export type HandoffTokens = { access_token: string; refresh_token: string };
export type HandoffAttribution = Record<string, string>;

function withAttribution(base: string, attribution?: HandoffAttribution): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(attribution ?? {})) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Tokens minted here, handed to the app in the fragment; attribution in the query string ahead of it. */
export function buildHandoffUrl(tokens: HandoffTokens, attribution?: HandoffAttribution): string {
  const fragment = new URLSearchParams({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  return `${withAttribution(CALLBACK_URL, attribution)}#${fragment.toString()}`;
}

/** The Supabase user id (`sub`) from an access token, for identify — no network round trip. */
export function userIdFromAccessToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" ? sub : undefined;
  } catch {
    return undefined;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<HandoffTokens> {
  const { data, error } = await (await getAuthClient()).auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Sign-in failed");
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

/**
 * Create an account. With email confirmation on, there is no session yet: the
 * confirmation link goes straight to the app's callback, attribution attached.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  attribution?: HandoffAttribution,
): Promise<{ tokens: HandoffTokens | null }> {
  const { data, error } = await (await getAuthClient()).auth.signUp({
    email,
    password,
    options: { emailRedirectTo: withAttribution(CALLBACK_URL, attribution) },
  });
  if (error) throw error;
  // Supabase answers a signup for an existing address with an identity-less user
  // rather than an error, so the address cannot be probed. Say so plainly here.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("User already registered");
  }
  if (!data.session) return { tokens: null };
  return { tokens: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } };
}

/** Full-page redirect through Supabase and Google, straight to the app's callback. */
export async function signInWithGoogle(attribution?: HandoffAttribution): Promise<void> {
  const { error } = await (await getAuthClient()).auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: withAttribution(CALLBACK_URL, attribution) },
  });
  if (error) throw error;
}

/** "9876543210" → "+919876543210". The OTP provider sends to Indian numbers only. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return `+${digits}`;
  return null;
}

async function resolveFunctionError(error: unknown): Promise<Error> {
  const context = (error as Partial<FunctionsHttpError>).context;
  if (context instanceof Response) {
    try {
      const body = await context.json();
      if (body?.error) return new Error(body.error);
    } catch {
      // fall through to the generic error below
    }
  }
  return error instanceof Error ? error : new Error("Request failed");
}

// A phone keeps its last few 2Factor session ids, newest first: each OTP is only
// valid against the send that generated it, and an impatient Resend must not
// strand the code from the first SMS that is still on its way.
const MAX_SESSIONS_PER_PHONE = 3;
const pendingOtpSessions = new Map<string, string[]>();

export async function sendPhoneOtp(phone: string): Promise<void> {
  const { data, error } = await (await getAuthClient()).functions.invoke("send-phone-otp", {
    body: { phone },
  });
  if (error) throw await resolveFunctionError(error);
  if (!data?.sessionId) throw new Error("No OTP session returned");
  const sessions = pendingOtpSessions.get(phone) ?? [];
  pendingOtpSessions.set(phone, [data.sessionId, ...sessions].slice(0, MAX_SESSIONS_PER_PHONE));
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<HandoffTokens> {
  const sessionIds = pendingOtpSessions.get(phone);
  if (!sessionIds || sessionIds.length === 0) throw new Error("OTP expired, please resend");
  const { data, error } = await (await getAuthClient()).functions.invoke("verify-phone-otp", {
    body: { phone, sessionIds, otp },
  });
  if (error) throw await resolveFunctionError(error);
  const { access_token, refresh_token } = data ?? {};
  if (!access_token || !refresh_token) throw new Error("Could not sign in");
  pendingOtpSessions.delete(phone);
  return { access_token, refresh_token };
}

/** True when the app has flagged an active session via the shared `.nursia.io` cookie. */
export function hasAppSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("pc_auth=1"));
}
