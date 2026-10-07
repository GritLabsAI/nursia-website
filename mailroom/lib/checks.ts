import { getLists, getSettings, suppressedSet, type Campaign } from "./db";
import { audienceOf, listIdsOf } from "./campaigns";
import { listDomains } from "./resend";
import { findTemplate } from "./templates";

/**
 * What stands between a campaign and a clean send. "block" stops it; "warn"
 * is for a person to weigh. Automatic sends treat two warnings as blocks (a
 * missing postal address, a dead unsubscribe page), because nobody is there
 * to read them first.
 */

export type Check = { level: "block" | "warn"; text: string };

export async function senderChecks(c: Pick<Campaign, "brand" | "from">): Promise<Check[]> {
  const out: Check[] = [];
  const s = await getSettings();
  if (!s.brands[c.brand].postalAddress)
    out.push({ level: "warn", text: `No postal address for ${c.brand} (Settings). CAN-SPAM requires one in marketing email; the footer will show a blank.` });
  const host = c.from.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  try {
    const { data } = await listDomains();
    const d = data.find((x) => x.name === host);
    if (!d) out.push({ level: "block", text: `${host} isn't a domain on this Resend account.` });
    else if (!d.open_tracking) out.push({ level: "warn", text: `Open tracking is off for ${d.name}, so this campaign will show 0% opens. Turn it on in Settings first.` });
  } catch (e) {
    out.push({ level: "warn", text: `Couldn't check domains: ${(e as Error).message}` });
  }
  if (!s.siteUrl) out.push({ level: "warn", text: "Mailroom's own address isn't set, so unsubscribe links won't work. Set it in Settings." });
  return out;
}

export async function campaignChecks(c: Campaign) {
  const out: Check[] = [];
  const lists = await getLists(listIdsOf(c));
  const blocked = await suppressedSet();
  const everyone = await audienceOf(c);
  const reachable = everyone.filter((x) => !blocked.has(x.email.toLowerCase())).length;
  if (!lists.length) out.push({ level: "block", text: "No list chosen." });
  else if (!reachable) out.push({ level: "block", text: "Everyone on the chosen lists has unsubscribed or bounced." });
  const total = lists.reduce((a, l) => a + l.contacts.length, 0);
  if (lists.length > 1 && total > everyone.length)
    out.push({ level: "warn", text: total - everyone.length === 1 ? "1 person is on more than one of these lists; they get it once." : `${total - everyone.length} people are on more than one of these lists; they get it once.` });
  for (const list of lists)
    if (list.source && Date.now() - Date.parse(list.refreshedAt ?? list.createdAt) > 6 * 3600_000)
      out.push({ level: "warn", text: `"${list.name}" was last pulled from ${list.source.source === "posthog" ? "PostHog" : "Supabase"} ${new Date(list.refreshedAt ?? list.createdAt).toLocaleString()}. Refresh it on the list page so it matches who qualifies today.` });
  out.push(...(await senderChecks(c)));
  const t = await findTemplate(c.templateId);
  const s = await getSettings();
  const LABEL = { playStoreUrl: "Google Play", appStoreUrl: "App Store" } as const;
  for (const k of t?.requires ?? [])
    if (!s.brands[c.brand][k]?.trim())
      out.push({ level: "block", text: `This email's button needs the ${c.brand === "nursia" ? "Nursia" : "PrepClever"} ${LABEL[k]} link. Add it in Settings, under "Links in emails".` });
  return { checks: out, reachable };
}

/** For unattended sends: the warnings that would be irresponsible to send through. */
export const blocksAutomatic = (x: Check) => x.level === "block" || /postal address|unsubscribe links/i.test(x.text);
