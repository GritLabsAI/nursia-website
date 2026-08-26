"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Where every paid-traffic CTA lands. Kept in one place so the three landing
 * pages can be pointed somewhere else in a single edit — signup is the whole
 * reason these pages exist, so it is also the thing most likely to move.
 */
export const LP_CTA_HREF = "/signup";

/** The click ids worth carrying forward. Anything else is the platform's noise. */
const CARRY = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

type Props = {
  /** channel slug, used when the ad click carried no utm_source */
  src: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
};

function Plain({ src, href = LP_CTA_HREF, className = "btn btn-primary", children }: Props) {
  return (
    <Link href={`${href}?src=${src}`} className={className}>
      {children}
    </Link>
  );
}

function Attributed({ src, href = LP_CTA_HREF, className = "btn btn-primary", children }: Props) {
  const from = useSearchParams();
  const out = new URLSearchParams();
  for (const key of CARRY) {
    const v = from.get(key);
    if (v) out.set(key, v);
  }
  out.set("src", from.get("utm_source") || src);

  return (
    <Link href={`${href}?${out.toString()}`} className={className}>
      {children}
    </Link>
  );
}

/**
 * Every CTA on a paid landing page has to survive the round trip to signup with
 * its attribution intact — the ad platforms hang utm_* and click ids on the
 * URL, and the form is a page away, so anything dropped here is a conversion
 * that can never be assigned to a campaign.
 *
 * Reading the query string opts the subtree out of static rendering, so the
 * plain channel-tagged link is what ships in the HTML and what a click gets
 * before hydration; the fuller one swaps in underneath it.
 */
export function CtaLink(props: Props) {
  return (
    <Suspense fallback={<Plain {...props} />}>
      <Attributed {...props} />
    </Suspense>
  );
}
