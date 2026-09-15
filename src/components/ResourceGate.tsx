"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { resourceClicked, resourceOffered } from "@/lib/analytics";
import { useVariant, type Experiment } from "@/lib/experiment";
import { useMaybeSignedIn } from "@/lib/gate";

/**
 * The offer. One per guide, in the position the experiment chose.
 *
 * The trade this component makes: the free thing costs an account, and an
 * account is an email and a password and no card. There is no mailing list
 * behind it and no address-for-PDF exchange — the person who unlocks a
 * resource *is* a user, which means their answers get kept, their weak
 * categories get named, and there is something to bring them back to. A list
 * of email addresses attached to nobody is worth far less and is a second
 * system to maintain.
 *
 * That constraint pushes back on the content, and it should: a resource has to
 * be worth making an account for. The `contains` list is rendered in full
 * rather than summarised for exactly that reason — it is the evidence for the
 * ask, and if it does not look worth it on the page then it is not worth it.
 *
 * Someone who already has an account never sees the ask. They get a link
 * straight to the thing, which is the whole difference between a gate and a
 * wall.
 */

export type Resource = {
  title: string;
  slug: string;
  kind?: string | null;
  promise: string;
  contains?: string[] | null;
  headline?: string | null;
  body?: string | null;
  ctaLabel?: string | null;
  delivery?: "page" | "file" | "practice" | null;
  destination?: string | null;
  file?: string | null;
};

type Props = {
  resource: Resource;
  experiment?: Experiment | null;
  guideSlug: string;
  /** Where on the page this instance is rendered. */
  at: "mid" | "end";
};

/** Where the resource actually lives once it is unlocked. */
function destinationFor(resource: Resource): string {
  if (resource.delivery === "file" && resource.file) return resource.file;
  return resource.destination ?? `/resources/${resource.slug}`;
}

export function ResourceGate({ resource, experiment, guideSlug, at }: Props) {
  const variant = useVariant(experiment);
  const signedIn = useMaybeSignedIn();
  const ref = useRef<HTMLElement | null>(null);
  const reported = useRef(false);

  const placement = variant?.placement ?? "mid";
  const shown = variant !== null && (placement === at || placement === "both");

  /* Fire when it is actually *seen*, not when it is rendered. An offer at the
     end of a long guide renders for everyone and is seen by the people who got
     there, and only the second number makes the placement test answerable. */
  useEffect(() => {
    if (!shown || reported.current) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      /* No observer — count it as seen rather than dropping the step, which
         would silently understate the top of the funnel on old browsers. */
      reported.current = true;
      resourceOffered({
        guide: guideSlug,
        resource: resource.slug,
        experiment: experiment?.key,
        variant: variant?.key,
        placement: at,
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || reported.current) continue;
          reported.current = true;
          resourceOffered({
            guide: guideSlug,
            resource: resource.slug,
            experiment: experiment?.key,
            variant: variant?.key,
            placement: at,
          });
          observer.disconnect();
        }
      },
      /* Half of it on screen, so a gate that merely clipped the viewport
         during a fast scroll does not count as an impression. */
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, guideSlug, resource.slug, experiment?.key, variant?.key, at]);

  if (!shown) {
    /* The control copy, for a reader with JavaScript off. They get an offer;
       they are just not in the experiment, because we cannot record what they
       saw and guessing would poison the arm they were never in. */
    return at === "mid" ? (
      <noscript>
        <aside className="my-12 rounded-sm border border-ink bg-paper-2 px-6 py-6">
          <p className="eyebrow">Free with an account</p>
          <p className="mt-2 font-display text-[1.1875rem] font-bold leading-snug tracking-[-0.02em] text-ink">
            {resource.headline ?? resource.title}
          </p>
          <p className="mt-2 font-body text-[0.9375rem] leading-relaxed text-ink-2">
            {resource.promise}
          </p>
          <Link href="/signup" className="btn btn-ghost mt-4 inline-flex">
            {resource.ctaLabel ?? "Start free →"}
          </Link>
        </aside>
      </noscript>
    ) : null;
  }

  const destination = destinationFor(resource);
  const headline = variant?.headline || resource.headline || resource.title;
  const body =
    variant?.body ||
    resource.body ||
    "An account is an email and a password — no card.";
  const label = variant?.ctaLabel || resource.ctaLabel || "Unlock it free →";

  /* Everything the funnel needs to attribute the signup, carried in the query
     string under the names /signup forwards to the app (the Phase 2 allowlist's
     guide / resource / experiment / variant) — otherwise every account looks
     like it arrived from nowhere and the content programme cannot be evaluated.
     `next` is kept for the on-site form. */
  const href = signedIn
    ? destination
    : `/signup?next=${encodeURIComponent(destination)}` +
      `&resource=${encodeURIComponent(resource.slug)}` +
      `&guide=${encodeURIComponent(guideSlug)}` +
      (experiment?.key ? `&experiment=${encodeURIComponent(experiment.key)}` : "") +
      (variant?.key ? `&variant=${encodeURIComponent(variant.key)}` : "");

  return (
    <aside
      ref={ref}
      className="not-prose my-12 rounded-sm border border-ink bg-paper-2 px-6 py-7"
    >
      <p className="eyebrow">
        {signedIn ? "Included with your account" : "Free with an account"}
        {resource.kind ? ` · ${kindLabel(resource.kind)}` : ""}
      </p>

      <h2 className="mt-2.5 font-display text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-ink sm:text-[1.375rem]">
        {headline}
      </h2>

      <p className="mt-2.5 max-w-2xl font-body text-[0.9375rem] leading-[1.65] text-ink-2 sm:text-base">
        {resource.promise}
      </p>

      {resource.contains?.length ? (
        <ul className="mt-5 flex flex-col gap-2">
          {resource.contains.map((item) => (
            <li
              key={item}
              className="flex gap-2.5 font-body text-[0.9375rem] leading-snug text-ink-2"
            >
              <span aria-hidden className="mt-[2px] shrink-0 text-teal">
                →
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={href}
          className="btn btn-primary"
          onClick={() =>
            resourceClicked({
              guide: guideSlug,
              resource: resource.slug,
              experiment: experiment?.key,
              variant: variant?.key,
              placement: at,
            })
          }
        >
          {signedIn ? "Open it →" : label}
        </Link>
        {!signedIn && (
          <span className="font-mono text-[11px] leading-relaxed text-muted">
            {body}
          </span>
        )}
      </div>
    </aside>
  );
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    checklist: "Checklist",
    plan: "Study plan",
    cheatsheet: "Reference",
    questionPack: "Question set",
    worked: "Worked examples",
    template: "Framework",
  };
  return labels[kind] ?? "Resource";
}
