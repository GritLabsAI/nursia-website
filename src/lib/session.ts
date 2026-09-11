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
  RecaptchaVerifier,
  getAdditionalUserInfo,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  type ConfirmationResult,
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

/* ------------------------------------------------------------------ phone */

/**
 * The reCAPTCHA that has to pass before Google will send an SMS.
 *
 * Invisible, so nobody sees anything unless Google decides this browser looks
 * like a robot — at which point it puts up the picture puzzle itself. It is not
 * optional and it cannot be faked: without a verifier, phone sign-in throws.
 *
 * One verifier per attempt. A verifier that has already produced a token cannot
 * produce a second one, so a retry after a wrong number would fail forever if it
 * were kept. Clearing it also removes the widget it appended to the container.
 */
let verifier: RecaptchaVerifier | null = null;

function resetVerifier() {
  try {
    verifier?.clear();
  } catch {
    /* already gone, or the container was unmounted from under it */
  }
  verifier = null;
}

/**
 * Send the code. `e164` is already in Firebase's shape — see lib/phone, which
 * owns the country codes and the length rules. `containerId` is an empty div
 * the widget can live in.
 *
 * The returned object is what carries the confirmation back — hold it, and
 * hand it to `confirmPhoneCode` with whatever they type.
 */
export async function startPhoneSignIn(
  e164: string,
  containerId: string,
): Promise<ConfirmationResult> {
  const auth = requireAuth();
  resetVerifier();
  verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  try {
    return await signInWithPhoneNumber(auth, e164, verifier);
  } catch (error) {
    /* A failed send leaves a spent verifier behind; the next attempt needs a
       fresh one or it fails for a reason that has nothing to do with the code. */
    resetVerifier();
    throw error;
  }
}

/**
 * Check the six digits. Like Google, one flow covers signing up and signing in,
 * so which it was is only known afterwards.
 */
export async function confirmPhoneCode(
  confirmation: ConfirmationResult,
  code: string,
): Promise<{ isNew: boolean }> {
  const credential = await confirmation.confirm(code.trim());
  resetVerifier();
  return { isNew: getAdditionalUserInfo(credential)?.isNewUser ?? false };
}

/** Drop the widget when the form leaves the page or switches away from phone. */
export function cancelPhoneSignIn() {
  resetVerifier();
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function signOut() {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}

export { authMessage };
