"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/session";

/**
 * The gate. Two fields, one alternative — no name, no school, no test date.
 * The test date is worth asking for later, inside the product, when it buys
 * the student a study plan.
 *
 * There is no backend yet: this records the session in localStorage so the
 * post-auth pages are walkable. Wire `signIn` to a real auth provider to ship.
 */

/* 16px is the floor: anything smaller and iOS Safari zooms the page on focus. */
const FIELD =
  "min-h-[52px] w-full rounded-sm border border-rule bg-paper px-3.5 text-[1rem] text-ink outline-none transition-colors focus:border-teal focus:bg-white";

export function SignupForm({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    setError(null);
    signIn(email);
    router.push("/try");
  }

  const cta = mode === "signup" ? "Start free →" : "Log in →";

  return (
    <div className="rounded-sm border border-rule bg-white p-5 sm:p-7 lg:p-8">
      <form onSubmit={submit} className="flex flex-col gap-4">
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
              onClick={() => setShow((s) => !s)}
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
          <a
            href="/login"
            className="-mt-1 self-start font-mono text-[11px] text-teal underline underline-offset-4"
          >
            Forgot password?
          </a>
        )}

        {error && (
          <p role="alert" className="font-mono text-[11px] text-wrong">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-1 min-h-[52px] w-full text-[1rem]">
          {cta}
        </button>
      </form>

      <div className="my-5 flex items-center gap-4">
        <span className="h-px flex-1 bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">or</span>
        <span className="h-px flex-1 bg-rule" aria-hidden />
      </div>

      <button
        type="button"
        className="btn btn-ghost min-h-[52px] w-full text-[1rem]"
        onClick={() => {
          signIn("student@example.com");
          router.push("/try");
        }}
      >
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
        Continue with Google
      </button>

      <p className="mt-5 text-center font-mono text-[11px] leading-relaxed text-muted">
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
