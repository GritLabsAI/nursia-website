"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/session";

/**
 * The gate. Two ways in — a mobile number with a six-digit code, or an email
 * and a password — and Google alongside them. Nothing else is asked for: no
 * name, no school, no test date. The test date is worth asking for later,
 * inside the product, when it buys the student a study plan.
 *
 * There is no backend yet. `signIn` records the session in localStorage so the
 * post-auth pages are walkable, and the OTP step accepts any six digits. Wire
 * both to a real provider and nothing in this file's markup has to change.
 */

/* 16px is the floor: anything smaller and iOS Safari zooms the page on focus.
   Width is left off so the dial-code select can be narrow without two `w-`
   utilities fighting over which one the cascade honours. */
const FIELD_BASE =
  "min-h-[52px] rounded-sm border border-rule bg-paper px-3.5 text-[1rem] text-ink outline-none transition-colors focus:border-teal focus:bg-white";
const FIELD = `${FIELD_BASE} w-full`;

const DIAL_CODES = [
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+91", label: "IN +91" },
  { code: "+61", label: "AU +61" },
  { code: "+353", label: "IE +353" },
  { code: "+64", label: "NZ +64" },
  { code: "+27", label: "ZA +27" },
  { code: "+63", label: "PH +63" },
];

const OTP_LENGTH = 6;

type Method = "phone" | "email";

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

/** Six boxes that advance on type and step back on backspace. */
function OtpBoxes({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  function set(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      const next = [...value];
      next[i] = "";
      onChange(next);
      return;
    }
    /* A paste lands in one box — spread it across the rest. */
    const next = [...value];
    for (let k = 0; k < digits.length && i + k < OTP_LENGTH; k++) next[i + k] = digits[k];
    onChange(next);
    boxes.current[Math.min(i + digits.length, OTP_LENGTH - 1)]?.focus();
  }

  return (
    <div className="flex gap-2">
      {value.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={v}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !v && i > 0) boxes.current[i - 1]?.focus();
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          className="h-[56px] w-full min-w-0 rounded-sm border border-rule bg-paper text-center font-mono text-[1.25rem] text-ink outline-none transition-colors focus:border-teal focus:bg-white"
        />
      ))}
    </div>
  );
}

export function SignupForm({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("phone");
  const [error, setError] = useState<string | null>(null);

  const [dial, setDial] = useState("+1");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const verb = mode === "signup" ? "Start free" : "Log in";

  function enter(identity: string) {
    signIn(identity);
    router.push("/try");
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 7) {
      setError("That does not look like a full mobile number.");
      return;
    }
    setError(null);
    setSent(true);
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.some((d) => !d)) {
      setError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }
    setError(null);
    enter(`${dial}${phone.replace(/\D/g, "")}`);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    setError(null);
    enter(email);
  }

  function switchTo(next: Method) {
    setMethod(next);
    setError(null);
  }

  return (
    <div className="rounded-sm border border-rule bg-white p-5 sm:p-7 lg:p-8">
      {/* Two ways in, on one rail. The phone tab leads because it is the one
          that does not ask the student to invent a password. */}
      {!sent && (
        <div
          role="tablist"
          aria-label="How to continue"
          className="mb-5 flex gap-1 rounded-sm border border-rule bg-paper p-1"
        >
          {(
            [
              ["phone", "Mobile number"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={method === key}
              onClick={() => switchTo(key)}
              className={`min-h-11 flex-1 rounded-sm text-[0.875rem] font-semibold transition-colors ${
                method === key
                  ? "border border-rule bg-white text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {method === "phone" ? (
        sent ? (
          <form onSubmit={verify} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode(Array(OTP_LENGTH).fill(""));
                setError(null);
              }}
              className="-mt-1 self-start font-mono text-[11px] text-muted underline underline-offset-4 hover:text-ink"
            >
              ← Change number
            </button>

            <p className="font-body text-[0.9375rem] leading-relaxed text-ink-2">
              Enter the {OTP_LENGTH}-digit code we sent to{" "}
              <span className="font-mono text-[0.875rem] text-ink">
                {dial} {phone}
              </span>
              .
            </p>

            <OtpBoxes value={code} onChange={setCode} />

            <p className="font-mono text-[11px] text-muted">
              No code yet?{" "}
              <button
                type="button"
                onClick={() => setCode(Array(OTP_LENGTH).fill(""))}
                className="text-teal underline underline-offset-4"
              >
                Send it again
              </button>
            </p>

            {error && (
              <p role="alert" className="font-mono text-[11px] text-wrong">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary min-h-[52px] w-full text-[1rem]">
              Verify and continue →
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Mobile number</span>
              <div className="flex gap-2">
                <select
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  aria-label="Country code"
                  className={`${FIELD_BASE} w-[108px] shrink-0 font-mono text-[0.9375rem]`}
                >
                  {DIAL_CODES.map((c) => (
                    <option key={c.label} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  enterKeyHint="go"
                  placeholder="555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${FIELD_BASE} min-w-0 flex-1 placeholder:text-muted/70`}
                />
              </div>
              <span className="font-mono text-[11px] text-muted">
                We text a code. No calls, ever.
              </span>
            </label>

            {error && (
              <p role="alert" className="font-mono text-[11px] text-wrong">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary min-h-[52px] w-full text-[1rem]">
              Send my code →
            </button>
          </form>
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
            <a
              href="/login"
              className="-mt-1 self-end font-mono text-[11px] text-teal underline underline-offset-4"
            >
              Forgot password?
            </a>
          )}

          {error && (
            <p role="alert" className="font-mono text-[11px] text-wrong">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary min-h-[52px] w-full text-[1rem]">
            {verb} →
          </button>
        </form>
      )}

      {!sent && (
        <>
          <div className="my-5 flex items-center gap-4">
            <span className="h-px flex-1 bg-rule" aria-hidden />
            <span className="eyebrow">or continue with</span>
            <span className="h-px flex-1 bg-rule" aria-hidden />
          </div>

          <button
            type="button"
            className="btn btn-ghost min-h-[52px] w-full text-[1rem]"
            onClick={() => enter("student@example.com")}
          >
            <GoogleMark />
            Continue with Google
          </button>
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
