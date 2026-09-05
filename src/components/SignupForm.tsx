"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import Link from "next/link";
import { loggedIn, signedUp } from "@/lib/analytics";
import { useSession } from "@/lib/useSession";
import {
  AuthUnavailable,
  authMessage,
  cancelPhoneSignIn,
  confirmPhoneCode,
  looksLikePhone,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  startPhoneSignIn,
  toE164,
} from "@/lib/session";

/**
 * The gate. An email and a password, Google, or a mobile number. Nothing else
 * is asked for: no name, no school, no test date. The test date is worth asking
 * for later, inside the product, when it buys the student a study plan.
 *
 * The mobile tab is real now. The old one accepted any six digits and signed
 * you in, which is worse than not offering it at all; this one sends an actual
 * SMS through Firebase and will not let anyone past without the code in it.
 *
 * Three things about phone sign-in that are not obvious:
 *
 * - Google requires a reCAPTCHA before it will send an SMS. It is invisible
 *   until Google decides a browser looks automated, and it needs a real
 *   container in the DOM, which is the empty div at the bottom of this form.
 * - Every message costs money and the daily quota is finite, so the resend is
 *   behind a countdown. Without one, an impatient thumb sends six.
 * - One flow covers signing up and signing in. Which it was is only known once
 *   Firebase says whether it had seen the number before.
 */

/* Where the invisible reCAPTCHA mounts. It has to be a real element in the
   document before the first send, which is why the div is always rendered. */
const RECAPTCHA_ID = "nursia-recaptcha";

/* 16px is the floor: anything smaller and iOS Safari zooms the page on focus. */
const FIELD =
  "min-h-[52px] w-full rounded-sm border border-rule bg-paper px-3.5 text-[1rem] text-ink outline-none transition-colors focus:border-teal focus:bg-white";

function PhoneMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

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
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function SignupForm({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const router = useRouter();
  const { session, pending } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** which button is mid-flight, so all of them can be disabled and one spins */
  const [busy, setBusy] = useState<"email" | "google" | "reset" | "sms" | "code" | null>(null);

  /* Phone. `sent` doubles as the step: null is the number, an object is the
     code. Holding the confirmation rather than a token is Firebase's design —
     it is the thing that knows which send this code belongs to. */
  const [usePhone, setUsePhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<ConfirmationResult | null>(null);
  const [wait, setWait] = useState(0);

  const verb = mode === "signup" ? "Start free" : "Log in";

  /* The resend countdown, and the widget teardown when this form goes away. */
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  useEffect(() => cancelPhoneSignIn, []);

  /* Arriving here *already* signed in means this page is a dead end asking
     for a password they have already given, so send them on.
     
     Not when the session is one this form just created, though: that one is
     on its way to the exam, and racing it to /try would send every new
     account to the wrong place. */
  const signingIn = useRef(false);
  useEffect(() => {
    if (!pending && session && !signingIn.current) router.replace("/try");
  }, [pending, session, router]);

  /* Signing up lands you in the exam brief rather than on a dashboard: the
     fifty questions are the thing that was promised, and a menu in between is
     a page nobody asked for. Logging back in goes to the hub instead, where a
     finished report is waiting. */
  const destination = mode === "signup" ? "/exam" : "/try";

  /** One shape for every call: hold the buttons, translate the failure. */
  async function run(
    which: "email" | "google" | "reset" | "sms" | "code",
    action: () => Promise<void>,
  ) {
    setBusy(which);
    setError(null);
    setNote(null);
    /* "sms" only asks for a code; nothing is signed in until "code" lands. */
    if (which !== "reset" && which !== "sms") signingIn.current = true;
    try {
      await action();
    } catch (err) {
      signingIn.current = false;
      if (err instanceof AuthUnavailable) {
        setError("Accounts are not switched on yet. Practice questions work without one.");
      } else {
        /* An empty message means the person cancelled — a closed Google window
           is not an error and should not be reported as one. */
        const message = authMessage(err);
        if (message) setError(message);
      }
      setBusy(null);
      return;
    }
    setBusy(null);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    void run("email", async () => {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password);
        signedUp("email");
      } else {
        await signInWithEmail(email.trim(), password);
        loggedIn("email");
      }
      router.push(destination);
    });
  }

  function google() {
    void run("google", async () => {
      const { isNew } = await signInWithGoogle();
      /* Google is one button for both, so which event it was is only known
         after the fact, from whether Firebase had seen this account before. */
      if (isNew) signedUp("google");
      else loggedIn("google");
      router.push(destination);
    });
  }

  function forgot() {
    if (!email.trim()) {
      setError("Enter your email above first, and we will send a reset link.");
      return;
    }
    void run("reset", async () => {
      await resetPassword(email.trim());
      setNote("Reset link sent. Check your inbox, and the spam folder.");
    });
  }

  /** Ask for the code. Also used by the resend, which is the same call again. */
  function sendCode() {
    if (!looksLikePhone(phone)) {
      setError("That does not look like a mobile number. Include the country code, like +1.");
      return;
    }
    void run("sms", async () => {
      const confirmation = await startPhoneSignIn(phone, RECAPTCHA_ID);
      setSent(confirmation);
      setCode("");
      /* Long enough that nobody sends four messages waiting for the first,
         short enough to be usable when a carrier really has swallowed one. */
      setWait(45);
      setNote(`Code sent to ${toE164(phone)}.`);
    });
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sent || code.trim().length < 6) {
      setError("Enter the six-digit code we sent you.");
      return;
    }
    void run("code", async () => {
      const { isNew } = await confirmPhoneCode(sent, code);
      if (isNew) signedUp("phone");
      else loggedIn("phone");
      router.push(destination);
    });
  }

  /** Back to the number, dropping the spent verifier with it. */
  function editNumber() {
    cancelPhoneSignIn();
    setSent(null);
    setCode("");
    setWait(0);
    setError(null);
    setNote(null);
  }

  function togglePhone() {
    cancelPhoneSignIn();
    setUsePhone((v) => !v);
    setSent(null);
    setCode("");
    setWait(0);
    setError(null);
    setNote(null);
  }

  const locked = busy !== null;

  return (
    <div className="rounded-sm border border-rule bg-white p-5 sm:p-7 lg:p-8">
      {usePhone ? (
        <div className="flex flex-col gap-4">
          {sent ? (
            /* Step two. The number is shown back, so a typo is obvious without
               having to go looking for it. */
            <form onSubmit={submitCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Six-digit code</span>
                <input
                  required
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  enterKeyHint="go"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`${FIELD} text-center font-mono text-[1.25rem] tracking-[0.35em] placeholder:text-muted/60`}
                />
                <span className="font-mono text-[11px] text-muted">
                  Sent to {toE164(phone)} ·{" "}
                  <button
                    type="button"
                    onClick={editNumber}
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
              {note && !error && (
                <p role="status" className="font-mono text-[11px] leading-relaxed text-correct">
                  {note}
                </p>
              )}

              <button
                type="submit"
                disabled={locked}
                className="btn btn-primary min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "code" ? "Checking…" : `${verb} →`}
              </button>

              <button
                type="button"
                onClick={sendCode}
                disabled={locked || wait > 0}
                className="self-center font-mono text-[11px] text-teal underline underline-offset-4 disabled:text-muted disabled:no-underline"
              >
                {wait > 0
                  ? `Send again in ${wait}s`
                  : busy === "sms"
                    ? "Sending…"
                    : "Send a new code"}
              </button>
            </form>
          ) : (
            /* Step one. Deliberately not a form of its own — the enter key is
               wired to the same handler as the button. */
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Mobile number</span>
                <input
                  required
                  autoFocus
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="go"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendCode();
                    }
                  }}
                  className={`${FIELD} placeholder:text-muted/70`}
                />
                <span className="font-mono text-[11px] text-muted">
                  We text you a code. Standard message rates apply.
                </span>
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
          )}

          <button
            type="button"
            onClick={togglePhone}
            disabled={locked}
            className="self-center font-mono text-[11px] text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
          >
            Use an email instead
          </button>
        </div>
      ) : (
        <>
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
                enterKeyHint="next"
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
                  type={show ? "text" : "password"}
                  enterKeyHint="go"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={mode === "signup" ? "pw-hint" : undefined}
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
              {mode === "signup" && (
                <span id="pw-hint" className="font-mono text-[11px] text-muted">
                  At least 8 characters
                </span>
              )}
            </label>

            {mode === "login" && (
              <button
                type="button"
                onClick={forgot}
                disabled={locked}
                className="-mt-1 self-end font-mono text-[11px] text-teal underline underline-offset-4 disabled:opacity-50"
              >
                {busy === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            )}

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
              onClick={togglePhone}
              disabled={locked}
              className="btn btn-ghost min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PhoneMark />
              Continue with a mobile number
            </button>
          </div>
        </>
      )}

      <p className="mt-5 text-center text-[0.875rem] text-ink-2">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
              Log in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
              Start free
            </Link>
          </>
        )}
      </p>

      {/* The reCAPTCHA mounts here. Stays empty and invisible unless Google
          decides this browser has to prove it is a person. */}
      <div id={RECAPTCHA_ID} />

      <p className="mt-4 text-center font-mono text-[11px] leading-relaxed text-muted">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4 hover:text-ink">
          terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-ink">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
