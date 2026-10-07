/**
 * One-off: copies the local tool's history (internal/email/.data/db.json) into
 * Mailroom's database, so the hosted dashboard starts with everything that's
 * already been sent. Safe to re-run: rows that exist are left alone.
 * `npm run db:import`.
 *
 * Not copied: the local siteUrl (hosted Mailroom always uses its own address)
 * and automatic-flow progress (the hosted flows take their own baseline, so
 * nobody already onboarded gets a welcome).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const here = dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(readFileSync(join(here, "..", "..", "internal", "email", ".data", "db.json"), "utf8"));

const { siteUrl: _drop, ...settings } = db.settings;
await sql`insert into settings (key, value) values ('app', ${JSON.stringify({ siteUrl: "", ...settings })}::jsonb) on conflict (key) do nothing`;

for (const l of db.lists) {
  await sql`insert into lists (id, name, created_at, source, refreshed_at, hidden, contacts)
            values (${l.id}, ${l.name}, ${l.createdAt}, ${l.source ? JSON.stringify(l.source) : null}::jsonb, ${l.refreshedAt ?? null}, ${!!l.hidden}, ${JSON.stringify(l.contacts)}::jsonb)
            on conflict (id) do nothing`;
}

let sends = 0;
for (const c of db.campaigns) {
  const { id, status, createdAt, sends: rows, ...doc } = c;
  await sql`insert into campaigns (id, status, created_at, doc) values (${id}, ${status}, ${createdAt}, ${JSON.stringify(doc)}::jsonb) on conflict (id) do nothing`;
  for (const s of rows) {
    await sql`insert into sends (campaign_id, email, status, resend_id, error, sent_at, last_event, delivered_at, opened_at, clicked_at, bounced_at, complained_at)
              values (${id}, ${s.email.toLowerCase()}, ${s.status}, ${s.resendId ?? null}, ${s.error ?? null}, ${s.sentAt ?? null}, ${s.lastEvent ?? null},
                      ${s.delivered ?? null}, ${s.opened ?? null}, ${s.clicked ?? null}, ${s.bounced ?? null}, ${s.complained ?? null})
              on conflict do nothing`;
    sends++;
  }
}

for (const s of db.suppressions) {
  await sql`insert into suppressions (email, reason, at, campaign_id) values (${s.email.toLowerCase()}, ${s.reason}, ${s.at}, ${s.campaignId ?? null}) on conflict (email) do nothing`;
}

const counts = await sql`select (select count(*) from lists) l, (select count(*) from campaigns) c, (select count(*) from sends) s, (select count(*) from suppressions) x`;
console.log(`read ${db.lists.length} lists, ${db.campaigns.length} emails, ${sends} sends, ${db.suppressions.length} suppressions`);
console.log("database now has", counts[0]);
