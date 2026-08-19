import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
      <header className="flex h-16 items-center">
        <Link href="/" aria-label="Nursia — home">
          <Wordmark />
        </Link>
        <Link
          href="/signup"
          className="ml-auto text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
        >
          Start free
        </Link>
      </header>

      <div className="mx-auto max-w-md py-16">
        <h1 className="text-[2rem] leading-tight">Log in</h1>
        <p className="mt-4 font-body text-[1rem] leading-relaxed text-ink-2">
          Your progress, review list, and free-question count are waiting where you left them.
        </p>
        <div className="mt-8">
          <SignupForm mode="login" />
        </div>
        <p className="mt-6 text-center text-[0.875rem] text-ink-2">
          No account yet?{" "}
          <Link href="/signup" className="text-teal underline underline-offset-4">
            Start free
          </Link>
        </p>
      </div>
    </div>
  );
}
