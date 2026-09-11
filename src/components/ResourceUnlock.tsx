"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { resourceUnlocked } from "@/lib/analytics";
import { useSession } from "@/lib/useSession";

/**
 * The last step: the reader has an account, so give them the thing.
 *
 * Three states, and the middle one is the one people get wrong. `pending` is
 * Firebase working out whether this browser already has a session, and a page
 * that treats that beat as "signed out" shows a sign-up wall to somebody who
 * just signed up — which, on the page they were promised as the reward, is
 * about the worst moment available to do it. So it holds.
 *
 * On the gate being a funnel rather than a boundary: this is the same position
 * the question preview takes in src/lib/gate.ts. The content is rendered
 * client-side and someone determined can read it out of the JavaScript, and
 * that is fine. The page is `noindex` so it cannot rank in place of the guide
 * that offers it, and the thing genuinely worth an account was never the text
 * — it is having your answers kept, scored, and turned into a weak-topic list,
 * none of which exists without one.
 */
export function ResourceUnlock({
  slug,
  kind,
  title,
  children,
}: {
  slug: string;
  kind?: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const { session, pending } = useSession();
  const pathname = usePathname();
  const sent = useRef(false);

  useEffect(() => {
    if (!session || sent.current) return;
    sent.current = true;
    resourceUnlocked({ resource: slug, kind: kind ?? undefined });
  }, [session, slug, kind]);

  if (pending) {
    return (
      <div className="mt-10 border-t border-rule pt-8">
        <p className="font-mono text-[11px] text-muted">Checking your account…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mt-10 rounded-sm border border-ink bg-paper-2 px-6 py-7">
        <p className="eyebrow">One step left</p>
        <h2 className="mt-2.5 font-display text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-ink">
          Make a free account to open {title.toLowerCase()}
        </h2>
        <p className="mt-2.5 font-body text-[0.9375rem] leading-[1.65] text-ink-2">
          An email and a password, no card. It opens this, keeps every answer you give, and names
          the category costing you the most marks.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* Comes straight back here afterwards, rather than dropping them at
              a dashboard and making them find this page again. */}
          <Link
            href={`/signup?next=${encodeURIComponent(pathname)}&r=${encodeURIComponent(slug)}`}
            className="btn btn-primary"
          >
            Start free →
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="font-mono text-[0.8125rem] text-teal underline underline-offset-4 hover:text-teal-dark"
          >
            Already have an account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
