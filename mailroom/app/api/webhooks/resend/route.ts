import { addSuppression, applyEvent, getSetting } from "@/lib/db";
import { verifyResendWebhook } from "@/lib/webhook-verify";

/**
 * Live results. Resend posts every delivery, open, click, bounce and spam
 * complaint here as it happens, signed with the secret it gave when the
 * webhook was created (Settings → Connect live results stores it).
 */
export const dynamic = "force-dynamic";

type Event = { type: string; created_at: string; data: { email_id: string; to?: string[] } };

export async function POST(req: Request) {
  const body = await req.text();
  const secret = await getSetting<string>("resendWebhookSecret");
  if (!secret || !verifyResendWebhook(body, req.headers, secret)) return new Response("Bad signature", { status: 401 });

  const ev = JSON.parse(body) as Event;
  const at = ev.created_at || new Date().toISOString();
  const hit = await applyEvent(ev.data.email_id, ev.type, at);

  /* A hard bounce or a spam complaint means never again, straight away. */
  if (hit && (ev.type === "email.bounced" || ev.type === "email.complained"))
    await addSuppression({ email: hit.email, reason: ev.type === "email.bounced" ? "bounced" : "complained", at, campaignId: hit.campaign_id });

  /* 200 even for an email we didn't send (a test, or support mail): it's not an error. */
  return new Response(null, { status: 200 });
}
