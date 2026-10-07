/**
 * Connects the deployed Mailroom to the outside world. Run once after the
 * first deploy, and again if the address changes:
 *
 *   npm run schedule -- https://mailroom-xxx.vercel.app
 *
 * 1. A QStash schedule that calls /api/cron/tick every 5 minutes.
 * 2. A Resend webhook that posts delivery/open/click events to
 *    /api/webhooks/resend; its signing secret goes into Mailroom's database.
 *
 * Both are replaced, not duplicated, if they already point at this address.
 */
import { Client } from "@upstash/qstash";
import { neon } from "@neondatabase/serverless";

const base = (process.argv[2] || process.env.MAILROOM_PROD_URL || "").replace(/\/$/, "");
if (!base.startsWith("https://")) {
  console.error("Pass the deployed address, e.g. npm run schedule -- https://mailroom-xxx.vercel.app");
  process.exit(1);
}

/* 1. The 5-minute tick. */
const qstash = new Client({ token: process.env.QSTASH_TOKEN, baseUrl: process.env.QSTASH_URL });
const tick = `${base}/api/cron/tick`;
for (const s of await qstash.schedules.list()) {
  if (s.destination === tick || s.destination.endsWith("/api/cron/tick")) await qstash.schedules.delete(s.scheduleId);
}
const { scheduleId } = await qstash.schedules.create({ destination: tick, cron: "*/5 * * * *", retries: 2 });
console.log(`QStash: ${tick} every 5 minutes (${scheduleId})`);

/* 2. Live results from Resend. */
const resend = (path, init = {}) =>
  fetch(`https://api.resend.com${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" } }).then(async (r) => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Resend ${r.status}: ${body.message ?? JSON.stringify(body)}`);
    return body;
  });
const endpoint = `${base}/api/webhooks/resend`;
for (const h of (await resend("/webhooks")).data ?? []) if (h.endpoint === endpoint) await resend(`/webhooks/${h.id}`, { method: "DELETE" });
const hook = await resend("/webhooks", {
  method: "POST",
  body: JSON.stringify({ endpoint, events: ["email.sent", "email.delivered", "email.delivery_delayed", "email.opened", "email.clicked", "email.bounced", "email.complained"] }),
});
const sql = neon(process.env.DATABASE_URL);
await sql`insert into settings (key, value) values ('resendWebhookSecret', ${JSON.stringify(hook.signing_secret)}::jsonb)
          on conflict (key) do update set value = excluded.value`;
console.log(`Resend: events now post to ${endpoint}`);
