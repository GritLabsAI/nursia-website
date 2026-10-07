import { Liquid } from "liquidjs";
import { makeUnsubToken } from "./unsubscribe";
import { quizForEmail } from "./quiz";
import { readTemplate, templateAsset, type TemplateDef } from "./templates";
import type { Settings } from "./db";

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

const defaultSite = (brand: string) => (brand === "nursia" ? "https://nursia.io" : "https://app.prepclever.in");

export function unsubscribeUrl(settings: Settings, brand: string, email: string, campaignId?: string) {
  const token = makeUnsubToken({ e: email, b: brand, c: campaignId }, settings.unsubSecret);
  return `${settings.siteUrl.replace(/\/$/, "")}/unsubscribe?t=${token}`;
}

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Whether an uploaded email already links to unsubscribe, so it doesn't need the standard footer. */
export const hasUnsubscribe = (html: string) => /\{\{-?\s*(unsubscribe_url|preferences_url)/.test(html);

/**
 * The legal minimum under an uploaded email: who sent it, where from, and a
 * one-click way out. Goes just before </body>, or at the end of a fragment.
 */
export function withFooter(html: string, unsub: string, address: string, brandName: string) {
  const footer = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0"><tr><td align="center" style="padding:28px 24px 36px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#7a7f87">
<p style="margin:0 0 6px">You're receiving this because you signed up for ${escapeHtml(brandName)}.</p>
${address ? `<p style="margin:0 0 6px">${escapeHtml(brandName)} &middot; ${escapeHtml(address)}</p>` : ""}
<p style="margin:0"><a href="${escapeHtml(unsub)}" style="color:#7a7f87;text-decoration:underline">Unsubscribe</a></p>
</td></tr></table>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : html + footer;
}

/**
 * `mode: "preview"` points images at /tpl-asset so the dashboard iframe can
 * show them. `mode: "send"` embeds them as inline attachments (cid:), so the
 * PrepClever logo doesn't need hosting anywhere.
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
  const site = (brand.website || defaultSite(t.brand)).replace(/\/$/, "");
  const invite = (medium: string) =>
    `${site}/?utm_source=referral&utm_medium=${medium}&utm_campaign=friend_invite${vars.user_id ? `&utm_content=${encodeURIComponent(vars.user_id)}` : ""}`;
  const exam = t.brand === "nursia" ? "NCLEX" : vars.exam || "my exam";
  const name = t.brand === "nursia" ? "Nursia" : "PrepClever";
  const scope = {
    preferences_url: unsub,
    ...vars,
    unsubscribe_url: unsub,
    postal_address: brand.postalAddress || vars.postal_address || "",
    invite_url: invite("link"),
    invite_label: site.replace(/^https?:\/\//, ""),
    whatsapp_url: `https://wa.me/?text=${encodeURIComponent(`I'm prepping for ${exam} with ${name}. It's free to start. Join me: ${invite("whatsapp")}`)}`,
    continue_url: `${site}/?utm_source=email&utm_medium=lifecycle&utm_campaign=keep_practising`,
    instagram_url: brand.instagramUrl || "",
    play_store_url: brand.playStoreUrl || "",
    app_store_url: brand.appStoreUrl || "",
    /* Interactive questions: each option is a signed link that marks the answer. */
    quiz: t.quiz ? await quizForEmail(t.brand, vars, settings, t.quiz) : undefined,
  };

  const { html: source } = readTemplate(t);
  let html = await liquid.parseAndRender(source, scope);
  if (t.custom?.footer) html = withFooter(html, scope.unsubscribe_url, scope.postal_address, name);
  const attachments: Attachment[] = [];

  html = html.replace(/src="((?!https?:|cid:|data:)[^"]+)"/g, (_m: string, rel: string) => {
    if (opts.mode === "preview") return `src="/tpl-asset/${t.id}/${rel}"`;
    const asset = templateAsset(t, rel);
    /* An empty attachment makes Resend refuse the whole email; a broken image doesn't. */
    if (!asset) return `src="${rel}"`;
    const filename = rel.split("/").pop() ?? rel;
    const cid = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    if (!attachments.some((a) => a.content_id === cid)) {
      attachments.push({ filename, content: asset.base64, content_id: cid });
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
