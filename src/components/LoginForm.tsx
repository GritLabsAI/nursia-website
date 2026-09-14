"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import {
  type AuthMethod,
  type LoginMode,
  identifyPerson,
  loginFailed,
  loginStarted,
  loginViewed,
} from "@/lib/analytics";
import { APP_URL, CARRY, withCarried } from "@/lib/app-handoff";
import {
  type HandoffAttribution,
  type HandoffTokens,
  buildHandoffUrl,
  hasAppSession,
  normalizeIndianPhone,
  sendPhoneOtp,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  userIdFromAccessToken,
  verifyPhoneOtp,
} from "@/lib/supabaseAuth";

/**
 * Log in or start free, on nursia.io (NUR-28).
 *
 * The same three ways in the app offers — email and password, Google, an Indian
 * mobile number — and one job beyond signing someone in: carrying the reason
 * they arrived. Whatever attribution the landing page collected is on this
 * page's URL (the funnel stubs and CTAs forward it), and failing that, it is in
 * PostHog's first-touch properties for this browser. Either way it goes to the
 * app with the session, so the registration the app records carries a channel.
 */

/* 16px is the floor: anything smaller and iOS Safari zooms the page on focus. */
const FIELD =
  "min-h-[52px] w-full rounded-sm border border-rule bg-paper px-3.5 text-[1rem] text-ink outline-none transition-colors focus:border-teal focus:bg-white";

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function PhoneMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

/** A stable reason for login_failed; the raw message can echo the email back. */
function failureReason(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "invalid_credentials";
  if (m.includes("confirm")) return "email_not_confirmed";
  if (m.includes("already registered")) return "already_registered";
  if (m.includes("expired")) return "expired";
  if (m.includes("otp")) return "wrong_code";
  if (m.includes("password")) return "weak_password";
  if (m.includes("rate") || m.includes("too many")) return "rate_limited";
  if (m.includes("fetch") || m.includes("network")) return "network";
  return "other";
}

function friendly(reason: string): string {
  switch (reason) {
    case "invalid_credentials":
      return "That email and password do not match an account.";
    case "email_not_confirmed":
      return "Confirm your email first — the link is in your inbox.";
    case "already_registered":
      return "There is already an account with that email. Log in instead.";
    case "expired":
      return "That code has expired. Send a new one.";
    case "wrong_code":
      return "That code is not right. Check the SMS and try again.";
    case "weak_password":
      return "Choose a password of at least 6 characters.";
    case "rate_limited":
      return "Too many attempts. Wait a minute and try again.";
    case "network":
      return "Could not reach the server. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function LoginForm({ initialMode }: { initialMode: LoginMode }) {
  const params = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "sms" | "code" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const viewed = useRef(false);

  const isSignup = mode === "signup";
  const verb = isSignup ? "Start free" : "Log in";
  const locked = busy !== null;

  useEffect(() => {
    // Already signed in on the app: nothing to ask for.
    if (hasAppSession()) {
      window.location.replace(withCarried(APP_URL, params));
      return;
    }
    if (!viewed.current) {
      viewed.current = true;
      loginViewed(initialMode);
    }
  }, [initialMode, params]);

  /** This URL's attribution first; this browser's recorded first touch as the fallback. */
  function attribution(): HandoffAttribution {
    const out: HandoffAttribution = {};
    for (const key of CARRY) {
      const fromUrl = params.get(key);
      let value = fromUrl ?? undefined;
      if (!value) {
        try {
          const stored = posthog.__loaded ? posthog.get_property(`initial_${key}`) : undefined;
          if (typeof stored === "string") value = stored;
        } catch {
          /* analytics must never take a page down with it */
        }
      }
      if (value) out[key] = value;
    }
    return out;
  }

  function handOff(tokens: HandoffTokens) {
    const userId = userIdFromAccessToken(tokens.access_token);
    if (userId) identifyPerson(userId);
    window.location.replace(buildHandoffUrl(tokens, attribution()));
  }

  function fail(method: AuthMethod, err: unknown) {
    const reason = failureReason(err);
    loginFailed(method, mode, reason);
    setError(friendly(reason));
  }

  function needsAgreement(): boolean {
    if (isSignup && !agreed) {
      setError("Please agree to the Terms of Use and Privacy Policy first.");
      return true;
    }
    return false;
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setNote(null);
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    if (needsAgreement()) return;
    setBusy("email");
    loginStarted("email", mode);
    try {
      if (isSignup) {
        const { tokens } = await signUpWithPassword(email.trim(), password, attribution());
        if (tokens) return handOff(tokens);
        setNote("Check your email to confirm your account. The link signs you straight in.");
      } else {
        handOff(await signInWithPassword(email.trim(), password));
        return;
      }
    } catch (err) {
      fail("email", err);
    }
    setBusy(null);
  }

  async function google() {
    setError(null);
    if (needsAgreement()) return;
    setBusy("google");
    loginStarted("google", mode);
    try {
      await signInWithGoogle(attribution());
    } catch (err) {
      fail("google", err);
      setBusy(null);
    }
  }

  async function sendCode() {
    setError(null);
    const e164 = normalizeIndianPhone(phone);
    if (!e164) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    if (needsAgreement()) return;
    setBusy("sms");
    loginStarted("phone", mode);
    try {
      await sendPhoneOtp(e164);
      setSentTo(e164);
      setNote(null);
    } catch (err) {
      fail("phone", err);
    }
    setBusy(null);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    setBusy("code");
    try {
      handOff(await verifyPhoneOtp(sentTo, code));
      return;
    } catch (err) {
      fail("phone", err);
    }
    setBusy(null);
  }

  return (
    <div className="rounded-sm border border-rule bg-white p-5 sm:p-7 lg:p-8">
      <div className="mb-5 grid grid-cols-2 rounded-sm border border-rule p-1" role="tablist">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            disabled={locked}
            className={`min-h-[40px] rounded-sm font-mono text-[12px] uppercase tracking-[0.1em] transition-colors ${
              mode === m ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
            }`}
          >
            {m === "login" ? "Log in" : "Start free"}
          </button>
        ))}
      </div>

      {usePhone ? (
        sentTo ? (
          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Six-digit code</span>
              <input
                required
                autoFocus
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                className={`${FIELD} text-center font-mono text-[1.25rem] tracking-[0.35em] placeholder:text-muted/60`}
              />
              <span className="font-mono text-[11px] text-muted">
                Sent to {sentTo} ·{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSentTo(null);
                    setCode("");
                  }}
                  className="text-teal underline underline-offset-4"
                >
                  change
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="font-mono text-[11px] leading-relaxed text-wrong">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={locked || code.length !== 6}
              className="btn btn-primary min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "code" ? "Checking…" : `${verb} →`}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={locked}
              className="self-center font-mono text-[11px] text-teal underline underline-offset-4 disabled:text-muted"
            >
              {busy === "sms" ? "Sending…" : "Send a new code"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Indian mobile number</span>
              <div className="flex rounded-sm border border-rule bg-paper transition-colors focus-within:border-teal focus-within:bg-white">
                <span className="flex items-center pl-3.5 pr-2 font-mono text-[0.9375rem] text-ink">+91</span>
                <span className="my-2.5 w-px bg-rule" aria-hidden />
                <input
                  autoFocus
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendCode();
                    }
                  }}
                  className="min-h-[52px] w-full bg-transparent px-3.5 text-[1rem] text-ink outline-none placeholder:text-muted/70"
                />
              </div>
            </label>
            {error && (
              <p role="alert" className="font-mono text-[11px] leading-relaxed text-wrong">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={sendCode}
              disabled={locked}
              className="btn btn-primary min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "sms" ? "Sending…" : "Text me a code →"}
            </button>
          </div>
        )
      ) : (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Email</span>
            <input
              required
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${FIELD} placeholder:text-muted/70`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Password</span>
            <div className="relative">
              <input
                required
                minLength={6}
                type={show ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${FIELD} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
                className="absolute inset-y-0 right-0 px-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="font-mono text-[11px] leading-relaxed text-wrong">
              {error}
            </p>
          )}
          {note && (
            <p role="status" className="font-mono text-[11px] leading-relaxed text-correct">
              {note}
            </p>
          )}
          <button
            type="submit"
            disabled={locked}
            className="btn btn-primary min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "email" ? "One moment…" : `${verb} →`}
          </button>
        </form>
      )}

      {isSignup && (
        <label className="mt-4 flex items-start gap-2.5 text-[0.875rem] text-ink-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-teal"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      )}

      <div className="my-5 flex items-center gap-4">
        <span className="h-px flex-1 bg-rule" aria-hidden />
        <span className="eyebrow">or continue with</span>
        <span className="h-px flex-1 bg-rule" aria-hidden />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={google}
          disabled={locked}
          className="btn btn-ghost min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark />
          {busy === "google" ? "Waiting for Google…" : "Continue with Google"}
        </button>
        <button
          type="button"
          onClick={() => {
            setUsePhone((v) => !v);
            setSentTo(null);
            setCode("");
            setError(null);
          }}
          disabled={locked}
          className="btn btn-ghost min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PhoneMark />
          {usePhone ? "Use an email instead" : "Continue with an Indian mobile number"}
        </button>
      </div>
    </div>
  );
}
