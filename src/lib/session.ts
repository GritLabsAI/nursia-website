/**
 * The signed-in user.
 *
 * This was a localStorage stub; it is Firebase Auth now. The shape it exposes
 * is deliberately unchanged — a subscribable store read through
 * `useSyncExternalStore`, with `null` on the server and on the first client
 * paint — so the pages that read it did not have to change.
 *
 * The one new state is `pending`: Firebase takes a moment to work out whether
 * the browser already has a session, and a page that treats that moment as
 * "signed out" flashes the gate at someone who is signed in.
 */

import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { setAuthHint } from "@/lib/auth-hint";
import { authMessage, firebaseReady, getFirebaseAuth } from "@/lib/firebase";

export type Session = {
  uid: string;
  email: string;
  /** from a Google account; empty for an email signup */
  name: string;
};

/**
 * Kept as the shape of a tier that is not switched on: nothing is metered
 * while everything is free, so no page counts against this any more. It is
 * here for the day there is a paid tier to draw a line for.
 */
export const FREE_ALLOWANCE = 50;

let snapshot: Session | null = null;
/** true until Firebase has told us one way or the other */
let pending = firebaseReady;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

const toSession = (user: User): Session => ({
  uid: user.uid,
  email: user.email ?? "",
  name: user.displayName ?? "",
});

/* One listener for the whole app, opened by the first subscriber. */
function start() {
  if (started) return;
  started = true;

  const auth = getFirebaseAuth();
  if (!auth) {
    pending = false;
    return;
  }

  onAuthStateChanged(
    auth,
    (user) => {
      snapshot = user ? toSession(user) : null;
      pending = false;
      /* Written here rather than at the call sites so it covers every way the
         state can change: signing in, signing out, a token expiring, and
         another tab doing any of those. */
      setAuthHint(Boolean(user));
      emit();
    },
    () => {
      /* An auth backend we cannot reach is the same as being signed out, and
         the pages behind the gate say so rather than spinning. The hint is
         left alone: the session may well still be good once the network is,
         and clearing it would turn a blip into a silent sign-out. */
      snapshot = null;
      pending = false;
      emit();
    },
  );
}

export function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Session | null {
  return snapshot;
}

/** The server has no session, and neither does the first client paint. */
export function getServerSnapshot(): Session | null {
  return null;
}

/** True while Firebase is still deciding — render a hold, not the gate. */
export function isPending(): boolean {
  return pending;
}

export function getPendingServerSnapshot(): boolean {
  return true;
}

/** Subscribe to `pending` alongside the session; same listener set. */
export const subscribePending = subscribe;

export class AuthUnavailable extends Error {
  constructor() {
    super("Accounts are not switched on yet.");
    this.name = "AuthUnavailable";
  }
}

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthUnavailable();
  return auth;
}

export async function signUpWithEmail(email: string, password: string) {
  await createUserWithEmailAndPassword(requireAuth(), email, password);
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(requireAuth(), email, password);
}

export async function signInWithGoogle(): Promise<{ isNew: boolean }> {
  const provider = new GoogleAuthProvider();
  /* Always ask which account. Someone signed into a personal and a school
     Google in the same browser should get to choose. */
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(requireAuth(), provider);
  /* One button covers signing up and signing in; only Firebase knows which
     this was. */
  return { isNew: getAdditionalUserInfo(credential)?.isNewUser ?? false };
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function signOut() {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}

export { authMessage };
