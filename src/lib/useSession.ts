"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hydrateFromServer } from "@/lib/exam-session";
import {
  getPendingServerSnapshot,
  getServerSnapshot,
  getSnapshot,
  isPending,
  subscribe,
  type Session,
} from "@/lib/session";

/**
 * The one hook the gated pages read.
 *
 * `pending` is the part that matters: Firebase takes a beat to work out
 * whether this browser already has a session, and a page that treats that beat
 * as "signed out" flashes a sign-up wall at someone who is signed in — then
 * yanks it away. Hold instead.
 *
 * Signing in also pulls whatever exam is on the account down to this device,
 * once per account, which is what makes a sitting started on a laptop
 * continue on a phone.
 */
export function useSession(): { session: Session | null; pending: boolean } {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pending = useSyncExternalStore(subscribe, isPending, getPendingServerSnapshot);

  const uid = session?.uid ?? null;
  useEffect(() => {
    if (!uid) return;
    void hydrateFromServer();
  }, [uid]);

  return { session, pending };
}
