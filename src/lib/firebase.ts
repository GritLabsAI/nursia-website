/**
 * The Firebase client, initialised lazily and only in the browser.
 *
 * Lazily because every page on this site renders on the server and most of
 * them never touch an account: the auth and Firestore bundles should not be in
 * the payload of a topic page that a search engine sent someone to.
 *
 * `null` when the config is missing rather than a thrown error, so a checkout
 * without an .env.local still builds and still serves every public page. The
 * signed-in parts say plainly that they are offline instead of exploding.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Point at the local emulators instead of the real project. Set
 * NEXT_PUBLIC_FIREBASE_EMULATORS=1 and run `npx firebase emulators:start` to
 * exercise sign-up, rules, and Firestore writes without touching production
 * data or spending a real account on a test.
 */
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

/** Whether there is enough config to talk to Firebase at all. */
export const firebaseReady = Boolean(config.apiKey && config.projectId && config.authDomain);

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined" || !firebaseReady) return null;
  if (!app) {
    app = getApps().length
      ? getApp()
      : initializeApp({
          apiKey: config.apiKey!,
          authDomain: config.authDomain!,
          projectId: config.projectId!,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        });
  }
  return app;
}

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const instance = getFirebaseApp();
  if (!instance) return null;
  if (!auth) {
    auth = getAuth(instance);
    if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

let db: Firestore | null = null;

export function getDb(): Firestore | null {
  const instance = getFirebaseApp();
  if (!instance) return null;
  if (!db) {
    db = getFirestore(instance);
    if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8098);
  }
  return db;
}

/**
 * Firebase error codes are not for reading out loud. These are the ones a
 * person can actually hit on the two forms, in words that say what to do.
 *
 * The two "not enabled" cases are ours rather than theirs, so they say so —
 * a candidate who sees "wrong password" when the provider is switched off will
 * spend ten minutes resetting a password that was never the problem.
 */
export function authMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Log in instead.";
    case "auth/invalid-email":
      return "That does not look like an email address.";
    case "auth/weak-password":
      return "Passwords need to be at least 8 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match an account.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "We could not reach the server. Check your connection and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site, or use email.";
    case "auth/unauthorized-domain":
      /* The domain is missing from Firebase's authorised list. Nothing the
         person can do about it, so point them at the way in that does work
         rather than promising a fix the page cannot deliver. */
      return "Google sign-in is not available here yet. Use your email and a password instead.";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return "That sign-in method is not switched on yet. Try the other one.";
    default:
      return "Something went wrong signing you in. Try again in a moment.";
  }
}
