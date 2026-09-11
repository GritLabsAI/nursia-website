import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

/**
 * The wire between an edit in the Studio and the page a reader sees.
 *
 * Without this, a corrected fee or a fixed typo waits for the next deploy,
 * which on a content site means it waits for an engineer. The guides are
 * prerendered precisely so they arrive fast; this is what stops "prerendered"
 * from also meaning "stale until someone pushes".
 *
 * Configure the webhook in Sanity Manage:
 *   URL        https://nursia.io/api/revalidate
 *   Trigger    create, update, delete
 *   Filter     _type in ["guide", "seoPage", "nursingPage", "topic", "leadMagnet", "experiment", "author"]
 *   Projection {"tags": [_type, _type + ":" + slug.current], "path": select(
 *                _type == "guide" => "/guides/" + slug.current,
 *                _type == "seoPage" => "/nclex-review/" + slug.current,
 *                _type == "nursingPage" => "/nursing/" + slug.current, null
 *              )}
 *   Secret     SANITY_REVALIDATE_SECRET
 *
 * Both a tag list and an optional path, because they answer different
 * questions. Tags handle "this author's credential changed, fix every page
 * that quotes it". The path handles the ordinary case of one guide being
 * edited, where waiting for a tag to sweep is slower than just rebuilding the
 * one page that changed.
 */

type WebhookPayload = {
  tags?: string[];
  path?: string | null;
};

/** Signed by Sanity, so this must run per-request rather than be prerendered. */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    /* Fail loudly rather than accepting unsigned requests. An open
       revalidation endpoint is a free way to make us rebuild every page on
       demand, which is a denial-of-service with extra steps. */
    return new Response("Revalidation is not configured", { status: 500 });
  }

  try {
    const { isValidSignature, body } = await parseBody<WebhookPayload>(
      req,
      secret,
      /* Wait for Sanity's CDN to catch up before we re-read through it —
         otherwise the rebuild races the write and caches the old copy, which
         looks exactly like the webhook not firing at all. */
      true,
    );

    if (!isValidSignature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const revalidated: string[] = [];

    for (const tag of body?.tags ?? []) {
      /* The projection emits `_type + ":" + slug.current`, which is the string
         "null" when a document has no slug. Drop those rather than minting a
         tag nothing will ever match. */
      if (!tag || tag.endsWith(":null")) continue;
      /* "max" is stale-while-revalidate: the tagged pages are marked stale and
         refreshed in the background on the next visit, rather than every one
         of them becoming a blocking cache miss at once. That matters here
         because a single edit to an author's credentials tags fifty pages —
         expiring them together would turn one Studio save into fifty
         simultaneous cold renders. The single-argument form is deprecated in
         Next 16 for exactly this reason. */
      revalidateTag(tag, "max");
      revalidated.push(`tag:${tag}`);
    }

    if (body?.path) {
      revalidatePath(body.path);
      revalidated.push(`path:${body.path}`);
    }

    /* The indexes and the sitemap list every page, so any create or delete
       changes them even when the edited document itself is untouched. Both
       indexes are refreshed on every hook rather than only on the matching
       type: working out which index an edit affects means parsing the tags,
       and getting that wrong leaves a deleted page listed on a hub — a visible
       404 — to save one cache invalidation. */
    revalidatePath("/guides");
    revalidatePath("/nclex-review");
    revalidatePath("/nursing");
    revalidatePath("/sitemap.xml");

    if (revalidated.length === 0) {
      return NextResponse.json(
        { revalidated: false, reason: "Nothing in the payload to revalidate" },
        { status: 400 },
      );
    }

    return NextResponse.json({ revalidated, at: Date.now() });
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}
