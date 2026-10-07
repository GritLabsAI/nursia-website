import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over "id.timestamp.body"
 * with the endpoint's secret (whsec_…, base64 after the prefix). Anything
 * unsigned, mis-signed or more than five minutes old is refused, so nobody can
 * post fake opens to the dashboard.
 */
export function verifyResendWebhook(body: string, headers: Headers, secret: string) {
  const msgId = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!msgId || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${msgId}.${ts}.${body}`).digest();
  return sigs.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
