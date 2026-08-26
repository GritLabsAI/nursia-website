"use client";

import { useEffect, useState } from "react";
import { CtaLink } from "@/components/lp/CtaLink";

/**
 * Phone-only, and only once the hero CTA has scrolled off. Ad traffic arrives
 * on a phone far more often than organic does, so the button has to follow.
 */
export function LpSticky({ src, label, note }: { src: string; label: string; note: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 520);
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
        <p className="font-mono text-[11px] leading-tight text-muted">{note}</p>
        <CtaLink src={src} className="btn btn-primary ml-auto !py-2.5 !text-sm">
          {label}
        </CtaLink>
      </div>
    </div>
  );
}
