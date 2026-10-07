import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed unsubscribe tokens, shared by the campaign tool that writes them into
 * every email (internal/email/tool) and the public route that honours them
 * (/api/email/unsubscribe).
 *
 * Signed rather than a bare `?email=` because an unsigned link lets anyone
 * unsubscribe anyone else by typing an address into the URL. Stateless rather
 * than a lookup id because the tool runs on a laptop and the route runs on the
 * site — they share a secret, not a database.
 */

export type UnsubPayload = {
  /** Recipient address. */
  e: string;
  /** Brand key, so the confirmation page can say whose emails stop. */
  b: string;
  /** Campaign id, kept for attribution in the dashboard. */
  c?: string;
};

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function makeUnsubToken(payload: UnsubPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readUnsubToken(token: string, secret: string): UnsubPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof p?.e === "string" && typeof p?.b === "string" ? p : null;
  } catch {
    return null;
  }
}
