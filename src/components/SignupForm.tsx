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
export function SignupForm({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    setError(null);
    signIn(email);
    router.push("/try");
  }

  const cta = mode === "signup" ? "Start free →" : "Log in →";

  return (
    <div className="rounded-sm border border-rule bg-white p-7 sm:p-8">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-sm border border-rule bg-paper px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-teal"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Password</span>
          <input
            required
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="pw-hint"
            className="min-h-11 rounded-sm border border-rule bg-paper px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-teal"
          />
          <span id="pw-hint" className="font-mono text-[11px] text-muted">
            At least 8 characters
          </span>
        </label>

        {error && (
          <p role="alert" className="font-mono text-[11px] text-wrong">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full">
          {cta}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-rule" aria-hidden />
        <span className="font-mono text-[11px] text-muted">or</span>
        <span className="h-px flex-1 bg-rule" aria-hidden />
      </div>

      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={() => {
          signIn("student@example.com");
          router.push("/try");
        }}
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-muted">
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
