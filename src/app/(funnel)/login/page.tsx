import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { FunnelHeader } from "@/components/FunnelHeader";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
      <FunnelHeader altHref="/signup" altLabel="Start free" />

      <div className="mx-auto max-w-md pb-16 pt-8 sm:pt-12">
        <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2rem]">Welcome back</h1>
        <p className="mt-3 font-body text-[1.0625rem] leading-[1.6] text-ink-2">
          Your progress, review list, and free-question count are waiting where you left them.
        </p>
        <div className="mt-6">
          {/* The form carries the "no account yet?" line itself, in both modes. */}
          <SignupForm mode="login" />
        </div>
      </div>
    </div>
  );
}
