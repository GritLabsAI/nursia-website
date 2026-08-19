"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Slot 5 — mobile only, appears after 50% scroll on the long SEO pages.
 * Same three words as every other CTA on the site.
 */
export function StickyCta() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setShown(max > 400 && window.scrollY / max > 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur-sm transition-transform duration-300 lg:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!shown}
    >
      <div className="flex items-center gap-4">
        <p className="font-mono text-[11px] leading-tight text-muted">
          50 free questions
          <br />
          no card needed
        </p>
        <Link
          href="/signup"
          tabIndex={shown ? 0 : -1}
          className="btn btn-primary ml-auto !py-2.5 !text-sm"
        >
          Start free →
        </Link>
      </div>
    </div>
  );
}
