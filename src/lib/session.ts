/**
 * Front-end session stub.
 *
 * There is no auth backend in this build. The gate at /signup and the post-auth
 * pages behind it are wired through localStorage so the whole funnel is
 * walkable end to end. Replace signIn / signOut / read with real auth calls and
 * nothing else in the UI has to change.
 *
 * Exposed as a subscribable store so components can read it with
 * `useSyncExternalStore` rather than a mount effect.
 */

const KEY = "nursia.session";

export type Session = {
  email: string;
  /** the free tier has to still mean something on this side of the gate */
  questionsUsed: number;
  startedAt: string;
};

export const FREE_ALLOWANCE = 50;

/* Cached snapshot — useSyncExternalStore requires a stable reference between
   changes, so we only re-parse when something writes. */
let snapshot: Session | null = null;
let raw: string | null = null;
const listeners = new Set<() => void>();

function read(): Session | null {
  const next = window.localStorage.getItem(KEY);
  if (next !== raw) {
    raw = next;
    try {
      snapshot = next ? (JSON.parse(next) as Session) : null;
    } catch {
      snapshot = null;
    }
  }
  return snapshot;
}

function write(session: Session | null) {
  if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
  else window.localStorage.removeItem(KEY);
  read();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getSnapshot(): Session | null {
  return read();
}

/** The server has no session, and neither does the first client paint. */
export function getServerSnapshot(): Session | null {
  return null;
}

export function signIn(email: string) {
  const existing = getSnapshot();
  write(
    existing?.email === email
      ? existing
      : { email, questionsUsed: 8, startedAt: new Date().toISOString() },
  );
}

export function recordAnswered(count = 1) {
  const s = getSnapshot();
  if (!s) return;
  write({ ...s, questionsUsed: Math.min(FREE_ALLOWANCE, s.questionsUsed + count) });
}

export function signOut() {
  write(null);
}
