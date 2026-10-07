import { type NextRequest } from "next/server";
import { readUnsubToken } from "@/lib/email-unsubscribe";

/**
 * The one public piece of the campaign tool in internal/email/tool.
 *
 * Every campaign email links here with a signed token, and carries the same URL
 * in its List-Unsubscribe header so Gmail and Yahoo can show their own
 * unsubscribe button (RFC 8058 one-click, which they require of bulk senders).
 *
 * GET only shows a confirm button. Corporate link scanners open every URL in an
 * email the moment it arrives, so a GET that unsubscribed would quietly drop
 * whole company domains off the list. POST does the work — from the button, or
 * from the mailbox provider's one-click request.
 *
 * The suppression list is the Resend contact's `unsubscribed` flag, not a table
 * here. The tool reads it back before every send, so the site and the tool
 * agree without sharing a database.
 *
 * Needs RESEND_API_KEY and EMAIL_UNSUB_SECRET (the same value the tool signs
 * with) in the deployed environment.
 */

export const dynamic = "force-dynamic";

const BRANDS: Record<string, string> = { nursia: "Nursia", prepclever: "PrepClever" };

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F3EF;color:#14161A;font:16px/1.5 Helvetica,Arial,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:22px;margin:0 0 8px}p{color:#555A62;margin:0 0 20px}button{font:inherit;font-weight:bold;background:#14161A;color:#fff;border:0;border-radius:8px;padding:12px 20px;cursor:pointer}</style>
</head><body><main>${body}</main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function verify(token: string | null) {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret || !token) return null;
  return readUnsubToken(token, secret);
}

async function suppress(email: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const body = JSON.stringify({ email, unsubscribed: true });
  /* Update first: most recipients will already be contacts. Fall back to
     create for an address the tool sent to but never registered. */
  const upd = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers,
    body,
  });
  if (upd.ok) return;
  const create = await fetch("https://api.resend.com/contacts", { method: "POST", headers, body });
  if (!create.ok) throw new Error(`Resend ${create.status}: ${await create.text()}`);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const p = verify(token);
  if (!p) return page("Link not valid", "<h1>This link isn't valid</h1><p>It may have been cut off. Reply to any of our emails and we'll take you off the list by hand.</p>", 400);
  const brand = BRANDS[p.b] ?? "our";
  return page(
    "Unsubscribe",
    `<h1>Unsubscribe from ${brand} emails?</h1><p>${escape(p.e)} will stop getting marketing email from us. Account emails, like password resets, still arrive.</p>
<form method="post"><input type="hidden" name="t" value="${escape(token!)}"><button type="submit">Unsubscribe</button></form>`,
  );
}

export async function POST(req: NextRequest) {
  /* One-click requests carry the token in the URL and "List-Unsubscribe=One-Click"
     in the body; the confirm button carries it in the form. Accept either. */
  let token = req.nextUrl.searchParams.get("t");
  if (!token) {
    const form = await req.formData().catch(() => null);
    const t = form?.get("t");
    token = typeof t === "string" ? t : null;
  }
  const p = verify(token);
  if (!p) return page("Link not valid", "<h1>This link isn't valid</h1><p>Reply to any of our emails and we'll take you off the list by hand.</p>", 400);
  try {
    await suppress(p.e);
  } catch (err) {
    console.error("unsubscribe failed", err);
    return page("Something went wrong", "<h1>That didn't go through</h1><p>Please try again in a minute, or reply to any of our emails and we'll do it by hand.</p>", 502);
  }
  return page("Unsubscribed", `<h1>You're unsubscribed</h1><p>${escape(p.e)} won't get ${BRANDS[p.b] ?? "our"} marketing email again.</p>`);
}
