import nodemailer, { type Transporter } from "nodemailer";

/**
 * The handful of Resend endpoints the tool needs, behind one throttle.
 *
 * The team's limit is 10 requests/second (from the ratelimit-* headers), shared
 * with the site's own support mail. Spacing calls 125ms apart keeps a big send
 * under it with room to spare; a 429 anyway waits out retry-after and tries again.
 */

const API = "https://api.resend.com";
const GAP_MS = 125;

let nextSlot = 0;
async function slot() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + GAP_MS;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

export class ResendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError(0, "RESEND_API_KEY is not set in .env.local");
  await slot();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return call(path, init, attempt + 1);
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ResendError(res.status, body.message ?? `Resend ${res.status}`);
  return body as T;
}

export type OutgoingEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  /** An AMP part (text/x-amp-html). The API has no field for it, so these go over SMTP. */
  amp?: string;
  reply_to?: string;
  scheduled_at?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  attachments?: { filename: string; content: string; content_id: string }[];
};

export function sendEmail(email: OutgoingEmail, idempotencyKey?: string) {
  /* SMTP can't schedule, so a scheduled send keeps to the API and its HTML part. */
  if (email.amp && !email.scheduled_at) return sendSmtp(email, idempotencyKey);
  return call<{ id: string }>("/emails", {
    method: "POST",
    body: JSON.stringify({ ...email, amp: undefined }),
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 256) } : {},
  });
}

/**
 * The same send through Resend's SMTP relay, which passes the MIME through as
 * built: text/plain, then text/x-amp-html, then text/html, the order AMP
 * clients need. Tags aren't available over SMTP; the idempotency key is a header.
 */
let smtp: Transporter | undefined;

async function sendSmtp(email: OutgoingEmail, idempotencyKey?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError(0, "RESEND_API_KEY is not set in .env.local");
  smtp ??= nodemailer.createTransport({ host: "smtp.resend.com", port: 465, secure: true, auth: { user: "resend", pass: key }, pool: true, maxConnections: 4 });
  await slot();
  try {
    const info = await smtp.sendMail({
      from: email.from,
      to: email.to,
      replyTo: email.reply_to,
      subject: email.subject,
      html: email.html,
      amp: email.amp,
      headers: { ...email.headers, ...(idempotencyKey ? { "Resend-Idempotency-Key": idempotencyKey.slice(0, 256) } : {}) },
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content, encoding: "base64", cid: a.content_id })),
    });
    /* Resend answers with its email id, which the webhooks are keyed on. */
    const id = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(info.response ?? "")?.[0] ?? info.messageId ?? "";
    return { id };
  } catch (e) {
    const code = (e as { responseCode?: number }).responseCode ?? 0;
    throw new ResendError(code, e instanceof Error ? e.message : String(e));
  }
}

export type EmailSummary = { id: string; created_at: string; last_event: string; to: string[] };

export function listEmails(after?: string) {
  const q = new URLSearchParams({ limit: "100" });
  if (after) q.set("after", after);
  return call<{ data: EmailSummary[]; has_more: boolean }>(`/emails?${q}`);
}

export function getEmail(id: string) {
  return call<EmailSummary>(`/emails/${id}`);
}

export type Domain = { id: string; name: string; status: string; open_tracking: boolean; click_tracking: boolean };

export type DnsRecord = { record: string; name: string; type: string; value: string; status: string; ttl?: string; priority?: number };

export type DomainDetail = Domain & { records: DnsRecord[]; tracking_subdomain?: string | null };

export function listDomains() {
  return call<{ data: Domain[] }>("/domains");
}

export function getDomain(id: string) {
  return call<DomainDetail>(`/domains/${id}`);
}

/**
 * Resend only honours open/click tracking once the domain has a verified
 * tracking subdomain. Before that, this PATCH still answers 200 and changes
 * nothing, so the caller must read the domain back to know if it took.
 */
export function setTracking(id: string, open: boolean, click: boolean) {
  return call(`/domains/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ open_tracking: open, click_tracking: click }),
  });
}

/** Can be changed later but never removed (Resend keeps old links working). */
export function setTrackingSubdomain(id: string, subdomain: string) {
  return call(`/domains/${id}`, { method: "PATCH", body: JSON.stringify({ tracking_subdomain: subdomain }) });
}

export function verifyDomain(id: string) {
  return call(`/domains/${id}/verify`, { method: "POST" });
}

export type ResendContact = { id: string; email: string; unsubscribed: boolean; created_at: string };

export async function listUnsubscribed() {
  const out: ResendContact[] = [];
  let after: string | undefined;
  for (let page = 0; page < 100; page++) {
    const q = new URLSearchParams({ limit: "100" });
    if (after) q.set("after", after);
    const res = await call<{ data: ResendContact[]; has_more: boolean }>(`/contacts?${q}`);
    out.push(...res.data.filter((c) => c.unsubscribed));
    if (!res.has_more || !res.data.length) break;
    after = res.data[res.data.length - 1].id;
  }
  return out;
}

/** Stops a scheduled email. Resend can't reschedule it afterwards; send again instead. */
export function cancelEmail(id: string) {
  return call(`/emails/${id}/cancel`, { method: "POST" });
}

/* ── webhooks: live delivery, open and click events ───────────────────── */

export type Webhook = { id: string; endpoint: string; events: string[]; status?: string };

export function listWebhooks() {
  return call<{ data: Webhook[] }>("/webhooks");
}

/** Returns the signing secret, which Resend shows only once. */
export function createWebhook(endpoint: string, events: string[]) {
  return call<{ id: string; signing_secret: string }>("/webhooks", {
    method: "POST",
    body: JSON.stringify({ endpoint, events }),
  });
}

export function deleteWebhook(id: string) {
  return call(`/webhooks/${id}`, { method: "DELETE" });
}
