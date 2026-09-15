"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { APP_LOGIN_URL } from "@/lib/app-handoff";
import { readAttribution } from "@/lib/attribution/allowlist";

/**
 * Where every paid-traffic CTA lands. Kept in one place so the three landing
 * pages can be pointed somewhere else in a single edit — signup is the whole
 * reason these pages exist, so it is also the thing most likely to move.
 *
 * Points straight at the app's login screen, not the app root: the root is a
 * client-side redirector that splashes for ~0.6-1.4s before sending a signed-out
 * visitor to /login anyway, and paid traffic is signed-out by definition.
 */
export const LP_CTA_HREF = APP_LOGIN_URL;

type Props = {
  /** landing-page slug, used when the visit carried no src of its own */
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
  // The shared allowlist (UTMs, Meta IDs, all three Google click ids, fbclid…),
  // validated. The landing-page slug no longer overwrites src with utm_source:
  // utm_source travels as itself, and src keeps meaning "which landing page".
  const out = readAttribution(useSearchParams()).forwarded;
  if (!out.has("src")) out.set("src", src);

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
