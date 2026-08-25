"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

/**
 * The funnel pages have no nav, so they also had no way out — on a phone the
 * only escape was the browser chrome. This gives back a real Back control:
 * history when there is any, home when the page was opened cold.
 */
export function FunnelHeader({
  altHref,
  altLabel,
}: {
  altHref: string;
  altLabel: string;
}) {
  const router = useRouter();
  // altHref/altLabel are unused while the login/signup cross-link below is hidden.
  void altHref;
  void altLabel;

  function back() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 -mx-5 border-b border-rule bg-paper/90 px-5 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="mx-auto flex h-14 max-w-[1140px] items-center gap-3 sm:h-16">
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M12 4L6 10l6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <Link href="/" aria-label="Nursia — home" className="flex items-center">
          <Wordmark />
        </Link>

        {/* Login/signup cross-link temporarily hidden — not working yet.
        <Link
          href={altHref}
          className="ml-auto min-h-11 shrink-0 content-center text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-teal"
        >
          {altLabel}
        </Link>
        */}
      </div>
    </header>
  );
}
