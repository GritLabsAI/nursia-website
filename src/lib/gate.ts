"use client";

import { useSyncExternalStore } from "react";
import { hasAuthHint } from "@/lib/auth-hint";

/**
 * How much of a question set someone gets without an account.
 *
 * The public pages exist to rank, and they rank because they carry real
 * questions in the server HTML. That does not have to mean an unlimited free
 * drill: the questions stay in the markup, crawlable and readable, and it is
 * the *interaction* that stops after a taste. Two is enough to prove the items
 * are good and the rationales are real, which is the only job the free set has.
 *
 * The gate is a funnel, not a security boundary. Anyone determined can read
 * the rest out of the page source, and that is fine — the thing worth an
 * account is having the answers kept, scored, and turned into a weak-topic
 * list, none of which exists without one.
 */
export const FREE_PREVIEW = 2;

export type GateConfig = {
  /** shown above the headline, e.g. "After 3 questions" */
  eyebrow: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  /** small links out, so the gate is never a dead end */
  exits?: { label: string; href: string }[];
};

/**
 * Does this browser probably have an account?
 *
 * Deliberately the localStorage hint rather than the real session: this runs on
 * every public page, and asking Firebase would pull the whole Auth bundle onto
 * pages that a search engine sent someone to. See `auth-hint.ts`.
 *
 * It answers false on the server and on the first paint, so the gate is in the
 * static HTML and hydration matches. A signed-in reader sees it for one frame
 * and then it is gone, which is the right way round: showing the gate briefly
 * to a member is a blink, while showing the full set briefly to a stranger is
 * the whole thing given away.
 */
export function useMaybeSignedIn(): boolean {
  return useSyncExternalStore(subscribeToHint, hasAuthHint, () => false);
}

/* Signing in or out in another tab changes the hint, and this is how a gate
   sitting open in a second tab hears about it. */
function subscribeToHint(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** The wording when the preview runs out, for surfaces without their own. */
export const PREVIEW_GATE: GateConfig = {
  eyebrow: `That is ${FREE_PREVIEW} of 1,200`,
  headline: "Make an account to keep going",
  body: "An account is an email and a password — no card. It opens the rest of the set, keeps every answer, and names the category costing you the most marks.",
  cta: { label: "Start free →", href: "/signup" },
  exits: [{ label: "See what an account gets you", href: "/pricing" }],
};
