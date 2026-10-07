import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { tick } from "@/lib/flows";

/**
 * Every 5 minutes, from a QStash schedule (scripts/schedule.mjs creates it).
 * Enrols anyone who's just finished onboarding and sends whatever's due.
 * QStash signs the call; anything unsigned is refused.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = verifySignatureAppRouter(async () => {
  const results = await tick();
  return Response.json({ ok: true, results });
});
