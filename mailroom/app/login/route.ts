/**
 * The sign-in screen. Google sign-in through Firebase Auth (project
 * mailroom-gritlabs); the page hands Firebase's ID token to
 * /api/auth/firebase, which checks it and sets Mailroom's session.
 * Falls back to the plain Google OAuth flow if only that is configured.
 */

const MESSAGES: Record<string, string> = {
  domain: "That Google account isn't on a team domain (gritlabsai.co, nursia.io or prepclever.in). Sign in with your work account.",
  state: "The sign-in took too long or was opened in another tab. Try again.",
  google: "Google didn't complete the sign-in. Try again.",
  config: "Sign-in isn't set up yet: the Firebase settings are missing in the Vercel project.",
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function GET(req: Request) {
  const err = new URL(req.url).searchParams.get("error");
  const firebase = process.env.FIREBASE_PROJECT_ID
    ? {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        appId: process.env.FIREBASE_APP_ID,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      }
    : null;
  const google = !firebase && !!process.env.GOOGLE_CLIENT_ID;
  const configured = !!firebase || google;
  const message = !configured ? MESSAGES.config : err ? MESSAGES[err] ?? MESSAGES.google : "";

  const gIcon = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>`;

  const button = firebase
    ? `<button class="g" id="go" type="button">${gIcon}<span>Continue with Google</span></button>`
    : `<a class="g" href="/api/auth/login" aria-disabled="${!configured}">${gIcon}<span>Continue with Google</span></a>`;

  /* Sign in with Firebase, swap its token for Mailroom's session, then let Firebase's session go. */
  const script = firebase
    ? `<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
const auth = getAuth(initializeApp(${JSON.stringify(firebase)}));
const go = document.getElementById("go"), box = document.getElementById("msg");
const show = (t) => { box.textContent = t; box.hidden = !t; };
go.addEventListener("click", async () => {
  go.disabled = true; go.querySelector("span").textContent = "Signing in…"; show("");
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const { user } = await signInWithPopup(auth, provider);
    const res = await fetch("/api/auth/firebase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken() }) });
    await signOut(auth);
    if (res.ok) return location.replace("/");
    show((await res.json().catch(() => ({}))).error || "Sign-in failed. Try again.");
  } catch (e) {
    const code = e && e.code;
    show(code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? "" :
         code === "auth/unauthorized-domain" ? "This address isn't allowed in Firebase yet: add it under Authentication, Settings, Authorized domains." :
         code === "auth/operation-not-allowed" ? "Google sign-in isn't switched on in Firebase yet: Authentication, Sign-in method, Google." :
         code === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again." :
         "Sign-in failed: " + (e && e.message || e));
  }
  go.disabled = false; go.querySelector("span").textContent = "Continue with Google";
});
</script>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Sign in · Mailroom</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--page:#f2f4f3;--surface:#fff;--ink:#1b2333;--muted:#667085;--line:#dfe3e8;--bad:#b42318;--bad-soft:#fdecea}
@media (prefers-color-scheme:dark){:root{--page:#12161d;--surface:#1a1f28;--ink:#e8ebf0;--muted:#98a2b3;--line:#2a313c;--bad:#ff8a80;--bad-soft:#321a19}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--page);color:var(--ink);font:15px/1.55 "Schibsted Grotesk",system-ui,sans-serif;padding:16px}
main{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:32px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;margin-bottom:22px}
.logo svg{width:30px;height:30px}.logo rect{fill:var(--ink)}.logo path{fill:none;stroke:var(--surface);stroke-width:2;stroke-linejoin:round}
h1{font-size:22px;margin:0 0 6px}p{color:var(--muted);margin:0 0 22px}
.g{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--ink);color:var(--surface);text-decoration:none;font:inherit;font-weight:600;padding:12px;border-radius:9px;border:0;cursor:pointer}
.g[aria-disabled=true],.g:disabled{opacity:.5;pointer-events:none}
.g svg{background:#fff;border-radius:50%;padding:2px;width:22px;height:22px}
.err{background:var(--bad-soft);color:var(--bad);border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:18px}
:focus-visible{outline:2px solid #2747d8;outline-offset:2px}
</style></head><body><main>
<div class="logo"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8"/><path d="M7 11h18v11H7z M7 11l9 7 9-7"/></svg>Mailroom</div>
<h1>Sign in</h1><p>Use your Grit Labs, Nursia or PrepClever Google account.</p>
<div class="err" role="alert" id="msg" ${message ? "" : "hidden"}>${esc(message)}</div>
${button}
</main>${script}</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
