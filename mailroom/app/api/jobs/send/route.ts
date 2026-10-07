import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { kick, processCampaign } from "@/lib/campaigns";

/**
 * Works through one chunk of a campaign's queued recipients, then queues
 * itself again until none are left. Called by QStash, signed.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = verifySignatureAppRouter(async (req: Request) => {
  const { campaignId } = (await req.json()) as { campaignId: string };
  const left = await processCampaign(campaignId);
  if (left > 0) await kick(campaignId);
  return Response.json({ ok: true, left });
});
