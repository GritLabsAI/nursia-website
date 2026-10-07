import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Liquid } from "liquidjs";
import { makeUnsubToken } from "../../../src/lib/email-unsubscribe";
import { readTemplate, type TemplateDef } from "./templates";
import type { Settings } from "./store";

/**
 * One template + one recipient -> one ready-to-send email.
 *
 * Liquid because the onboarding sequence already uses it ({% if %} and
 * `| default:`); the plain {{first_name}} tags in the lifecycle set are a
 * subset of it. Missing fields render empty rather than throwing, which is
 * what a merge tag should do when a CSV column is blank.
 */

const liquid = new Liquid({ strictVariables: false, strictFilters: true });

export type Attachment = { filename: string; content: string; content_id: string };

export type Rendered = {
  subject: string;
  html: string;
  attachments: Attachment[];
  unsubscribeUrl: string;
};

const db_default = (brand: string) => (brand === "nursia" ? "https://nursia.io" : "https://app.prepclever.in");

export function unsubscribeUrl(settings: Settings, brand: string, email: string, campaignId?: string) {
  const token = makeUnsubToken({ e: email, b: brand, c: campaignId }, settings.unsubSecret);
  return `${settings.siteUrl.replace(/\/$/, "")}/api/email/unsubscribe?t=${token}`;
}

/**
 * `mode: "preview"` points local images at the dashboard server so the iframe
 * can show them. `mode: "send"` embeds them as inline attachments (cid:), so
 * the PrepClever logo doesn't need to be hosted anywhere before it can be sent.
 */
export async function render(
  t: TemplateDef,
  subject: string,
  vars: Record<string, string>,
  settings: Settings,
  opts: { mode: "preview" | "send"; campaignId?: string },
): Promise<Rendered> {
  const brand = settings.brands[t.brand];
  const email = vars.email ?? "";
  const unsub = unsubscribeUrl(settings, t.brand, email, opts.campaignId);
  /* There are no per-user referral codes, so an invite is the site link with
     the sender's user id in utm_content — the app's attribution already keeps
     first-touch UTMs, which is enough to see who brought whom. */
  const site = (brand.website || db_default(t.brand)).replace(/\/$/, "");
  const invite = (medium: string) =>
    `${site}/?utm_source=referral&utm_medium=${medium}&utm_campaign=friend_invite${vars.user_id ? `&utm_content=${encodeURIComponent(vars.user_id)}` : ""}`;
  const exam = t.brand === "nursia" ? "NCLEX" : "my NISM exam";
  const name = t.brand === "nursia" ? "Nursia" : "PrepClever";
  const scope = {
    preferences_url: unsub,
    ...vars,
    unsubscribe_url: unsub,
    postal_address: brand.postalAddress || vars.postal_address || "",
    invite_url: invite("link"),
    invite_label: site.replace(/^https?:\/\//, ""),
    whatsapp_url: `https://wa.me/?text=${encodeURIComponent(`I'm prepping for ${exam} with ${name} — it's free to start. Join me: ${invite("whatsapp")}`)}`,
    continue_url: `${site}/?utm_source=email&utm_medium=lifecycle&utm_campaign=keep_practising`,
    instagram_url: brand.instagramUrl || "",
    play_store_url: brand.playStoreUrl || "",
    app_store_url: brand.appStoreUrl || "",
  };

  const { html: source, dir } = readTemplate(t);
  let html = await liquid.parseAndRender(source, scope);
  const attachments: Attachment[] = [];

  html = html.replace(/src="((?!https?:|cid:|data:)[^"]+)"/g, (_m: string, rel: string) => {
    if (opts.mode === "preview") return `src="/tpl-asset/${t.id}/${rel}"`;
    const filename = basename(rel);
    const cid = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    if (!attachments.some((a) => a.content_id === cid)) {
      attachments.push({
        filename,
        content: readFileSync(join(dir, rel)).toString("base64"),
        content_id: cid,
      });
    }
    return `src="cid:${cid}"`;
  });

  return {
    subject: await liquid.parseAndRender(subject, scope),
    html,
    attachments,
    unsubscribeUrl: unsub,
  };
}
