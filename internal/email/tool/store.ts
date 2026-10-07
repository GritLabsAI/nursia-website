import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brand } from "./templates";
import type { AudienceDef } from "./audiences";

/**
 * A single JSON file, because this is one person's tool on one laptop and the
 * numbers that matter (who opened what) live in Resend anyway. The file only
 * remembers which Resend email id went to whom, so the dashboard can ask.
 *
 * Kept in internal/email/.data/, which is gitignored: it holds contact lists.
 */

export type Contact = { email: string } & Record<string, string>;

export type ContactList = {
  id: string;
  name: string;
  createdAt: string;
  contacts: Contact[];
  /** Set when the list was built from Supabase/PostHog, so it can be re-run. */
  source?: AudienceDef;
  refreshedAt?: string;
  /** Made by a flow for one step run; kept for the numbers, not shown as a list. */
  hidden?: boolean;
};

export type SendStatus = "queued" | "sent" | "failed" | "skipped" | "canceled";

export type Send = {
  email: string;
  status: SendStatus;
  resendId?: string;
  error?: string;
  sentAt?: string;
  lastEvent?: string;
  /* First time each was seen. Sticky: an email that was clicked and later
     re-opened reports last_event "opened", but it was still clicked. */
  delivered?: string;
  opened?: string;
  clicked?: string;
  bounced?: string;
  complained?: string;
};

export type Campaign = {
  id: string;
  name: string;
  templateId: string;
  brand: Brand;
  subject: string;
  from: string;
  replyTo?: string;
  listId: string;
  /** Several lists at once; deduped by email when sent. listId stays the first. */
  listIds?: string[];
  vars: Record<string, string>;
  scheduledAt?: string;
  status: "draft" | "sending" | "sent" | "failed" | "canceled";
  createdAt: string;
  sentAt?: string;
  error?: string;
  sends: Send[];
  /** Set when a flow step sent this, so the flow page can total it per step. */
  flow?: { id: string; step: string };
};

export type Suppression = {
  email: string;
  reason: "unsubscribed" | "bounced" | "complained" | "manual";
  at: string;
  campaignId?: string;
};

export type BrandSettings = {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  postalAddress: string;
  /** Where invite and "keep practising" links point. */
  website: string;
  instagramUrl: string;
  playStoreUrl: string;
  appStoreUrl: string;
};

export type StoredSettings = { siteUrl: string; brands: Record<Brand, BrandSettings> };

export type Settings = StoredSettings & { unsubSecret: string };

/** Per flow: switches, step settings, and who has had which step (by Supabase user id). */
export type FlowState = {
  autoRun: boolean;
  params: Record<string, Record<string, string>>;
  enrolled: Record<string, { email: string; steps: Record<string, string> }>;
  running?: string;
  lastRunAt?: string;
  lastAutoResult?: string;
};

export type Db = {
  settings: StoredSettings;
  lists: ContactList[];
  campaigns: Campaign[];
  suppressions: Suppression[];
  flows: Record<string, FlowState>;
  syncedAt?: string;
};

/* Overridable so a test run can use a scratch folder instead of the real history. */
const DIR = process.env.EMAIL_TOOL_DATA_DIR || join(import.meta.dirname, "..", ".data");
const FILE = join(DIR, "db.json");

const EMPTY: Db = {
  settings: {
    siteUrl: "https://nursia.io",
    brands: {
      nursia: { fromName: "Nursia", fromEmail: "arpan@nursia.io", replyTo: "arpan@nursia.io", postalAddress: "", website: "https://nursia.io", instagramUrl: "https://www.instagram.com/nursia.io/", playStoreUrl: "", appStoreUrl: "" },
      prepclever: { fromName: "PrepClever", fromEmail: "arpan@prepclever.in", replyTo: "arpan@prepclever.in", postalAddress: "", website: "https://app.prepclever.in", instagramUrl: "", playStoreUrl: "", appStoreUrl: "" },
    },
  },
  lists: [],
  campaigns: [],
  suppressions: [],
  flows: {},
};

export const db: Db = existsSync(FILE)
  ? { ...structuredClone(EMPTY), ...JSON.parse(readFileSync(FILE, "utf8")) }
  : structuredClone(EMPTY);

/* A db.json from before a setting existed gets its default, rather than undefined. */
for (const k of ["nursia", "prepclever"] as const) db.settings.brands[k] = { ...EMPTY.settings.brands[k], ...db.settings.brands[k] };

/** Write-then-rename, so a crash mid-save can't leave half a file. */
export function save() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${FILE}.tmp`, JSON.stringify(db, null, 1));
  renameSync(`${FILE}.tmp`, FILE);
}

export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
