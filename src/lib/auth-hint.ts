/**
 * A one-bit answer to "might this browser be signed in?".
 *
 * The site header is on every public page, including the ones a search engine
 * sent someone to, and those pages must not pay for the Firebase Auth bundle
 * just so the header can render a name. But the header still has to know, or a
 * signed-in reader sees "Log in" on every page and reasonably concludes they
 * have been logged out.
 *
 * So: this flag is written whenever auth state settles, and it is the only
 * thing the header reads on first paint. No hint means anonymous, and Firebase
 * is never loaded at all. A hint means load the real thing and ask it properly.
 *
 * It is a hint and nothing else — never a permission. It says who to *ask*,
 * not who someone *is*, and every actual answer still comes from Firebase and
 * the security rules. Someone setting this by hand gets a spinner and then the
 * signed-out header.
 */

const KEY = "nursia.maybe-signed-in";

export function setAuthHint(signedIn: boolean) {
  try {
    if (signedIn) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* private mode, or storage disabled — the header falls back to signed-out,
       which is the safe way to be wrong */
  }
}

export function hasAuthHint(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
