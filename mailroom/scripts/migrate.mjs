/**
 * Creates Mailroom's tables in its own Neon database. Safe to run again:
 * everything is "if not exists". `npm run db:migrate`.
 *
 * Nothing here touches the Nursia or PrepClever app databases; those are only
 * ever read, over their APIs.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `create table if not exists settings (
     key text primary key,
     value jsonb not null
   )`,
  `create table if not exists lists (
     id text primary key,
     name text not null,
     created_at timestamptz not null default now(),
     source jsonb,
     refreshed_at timestamptz,
     hidden boolean not null default false,
     contacts jsonb not null default '[]'
   )`,
  /* The campaign itself is a document (template, subject, lists, vars…);
     who it went to and what happened lives in sends, one row per person. */
  `create table if not exists campaigns (
     id text primary key,
     status text not null,
     created_at timestamptz not null default now(),
     doc jsonb not null
   )`,
  `create table if not exists sends (
     campaign_id text not null references campaigns(id) on delete cascade,
     email text not null,
     status text not null,
     contact jsonb,
     resend_id text,
     error text,
     sent_at timestamptz,
     last_event text,
     delivered_at timestamptz,
     opened_at timestamptz,
     clicked_at timestamptz,
     bounced_at timestamptz,
     complained_at timestamptz,
     opens int not null default 0,
     clicks int not null default 0,
     primary key (campaign_id, email)
   )`,
  `create unique index if not exists sends_resend_id on sends (resend_id) where resend_id is not null`,
  `create index if not exists sends_queued on sends (campaign_id) where status = 'queued'`,
  `create table if not exists suppressions (
     email text primary key,
     reason text not null,
     at timestamptz not null default now(),
     campaign_id text
   )`,
  `create table if not exists flows (
     id text primary key,
     doc jsonb not null
   )`,
  /* Who has entered an automatic flow and which steps they've had.
     baseline = was already onboarded when the flow was switched on, so never welcomed. */
  `create table if not exists enrollments (
     flow_id text not null,
     user_id text not null,
     email text not null,
     first_seen timestamptz not null default now(),
     baseline boolean not null default false,
     steps jsonb not null default '{}',
     primary key (flow_id, user_id)
   )`,
  /* Templates uploaded from the dashboard: HTML, images and settings in doc.
     Archived ones stay so sent emails can still be opened. */
  `create table if not exists templates (
     id text primary key,
     brand text not null,
     archived boolean not null default false,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now(),
     doc jsonb not null
   )`,
  `create table if not exists quiz_answers (
     id bigserial primary key,
     quiz_key text not null,
     idx int not null,
     brand text not null,
     email text not null,
     question_id text not null,
     choice int not null,
     correct boolean not null,
     answered_at timestamptz not null default now(),
     unique (quiz_key, idx)
   )`,
];

for (const s of statements) await sql.query(s);
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
console.log("tables:", tables.map((t) => t.table_name).join(", "));
