"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  AuthUnavailable,
  authMessage,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/session";

/**
 * The gate. An email and a password, or Google. Nothing else is asked for: no
 * name, no school, no test date. The test date is worth asking for later,
 * inside the product, when it buys the student a study plan.
 *
 * This is Firebase Auth now rather than a stub. The mobile-number tab that
 * used to lead here is gone: it accepted any six digits and signed you in,
 * which is worse than not offering it, and real SMS costs money per message.
 * It is a provider switch and a reCAPTCHA away if it earns its place later.
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** which button is mid-flight, so both can be disabled and only one spins */
  const [busy, setBusy] = useState<"email" | "google" | "reset" | null>(null);

  const verb = mode === "signup" ? "Start free" : "Log in";

  /* Signing up lands you in the exam brief rather than on a dashboard: the
     fifty questions are the thing that was promised, and a menu in between is
     a page nobody asked for. Logging back in goes to the hub instead, where a
     finished report is waiting. */
  const destination = mode === "signup" ? "/exam" : "/try";

  /** One shape for every call: hold the buttons, translate the failure. */
  async function run(which: "email" | "google" | "reset", action: () => Promise<void>) {
    setBusy(which);
    setError(null);
    setNote(null);
    try {
      await action();
    } catch (err) {
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
      if (mode === "signup") await signUpWithEmail(email.trim(), password);
      else await signInWithEmail(email.trim(), password);
      router.push(destination);
    });
  }

  function google() {
    void run("google", async () => {
      await signInWithGoogle();
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

  const locked = busy !== null;

  return (
    <div className="rounded-sm border border-rule bg-white p-5 sm:p-7 lg:p-8">
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

      <button
        type="button"
        onClick={google}
        disabled={locked}
        className="btn btn-ghost min-h-[52px] w-full text-[1rem] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {busy === "google" ? "Waiting for Google…" : "Continue with Google"}
      </button>

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
