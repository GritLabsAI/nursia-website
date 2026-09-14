import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FunnelHeader } from "@/components/FunnelHeader";
import { LoginForm } from "@/components/LoginForm";
import { APP_URL, LOGIN_ON_SITE, type SearchParams, withCarried } from "@/lib/app-handoff";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

/**
 * Login on nursia.io (NUR-28, Growth PRD P0 requirement 01).
 *
 * This page used to be a bare redirect to the app, which put the most
 * identity-rich moment in the journey on the far side of the boundary that
 * destroys identity. Here, the anonymous visitor becomes a known person on the
 * domain that still holds their first touch, and the app receives an
 * already-identified user instead of stitching two anonymous halves together.
 *
 * Until Supabase is configured for this site the page keeps its old job —
 * sending the visitor to the app — but with the attribution intact.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const from = await searchParams;
  if (!LOGIN_ON_SITE) redirect(withCarried(APP_URL, from));
  const mode = from.mode === "signup" ? "signup" : "login";

  return (
    <div className="mx-auto max-w-[1140px] px-5 sm:px-8">
      <FunnelHeader altHref={mode === "signup" ? "/login" : "/login?mode=signup"} altLabel={mode === "signup" ? "Log in" : "Start free"} />

      <div className="mx-auto max-w-md pb-16 pt-8 sm:pt-12">
        <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2rem]">
          {mode === "signup" ? "Start practising for free" : "Welcome back"}
        </h1>
        <p className="mt-3 font-body text-[1.0625rem] leading-[1.6] text-ink-2">
          {mode === "signup"
            ? "Real NCLEX-RN questions with full rationales. No card, no trial that turns into a charge."
            : "Your progress, review list, and study plan are waiting where you left them."}
        </p>
        <div className="mt-6">
          <Suspense>
            <LoginForm initialMode={mode} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
