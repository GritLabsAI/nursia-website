import { createClient, type SanityClient } from "@sanity/client";

/**
 * The write side of the content lake, used only by the pipeline.
 *
 * This client holds a token that can rewrite every document in the dataset, so
 * it is import-guarded rather than merely undefined-tolerant: a missing token
 * stops the run with an explanation instead of letting forty documents fail
 * one at a time with a 401.
 *
 * `useCdn: false` everywhere here. The pipeline reads in order to decide what
 * to write — does this slug exist, which topic does it reference — and a
 * cached read is how you get two copies of the same guide.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The pipeline reads it from .env.local; run the ` +
        `stages through the npm scripts (which pass --env-file) rather than ` +
        `calling tsx directly.`,
    );
  }
  return value;
}

export function writeClient(): SanityClient {
  return createClient({
    projectId: required("NEXT_PUBLIC_SANITY_PROJECT_ID"),
    dataset: required("NEXT_PUBLIC_SANITY_DATASET"),
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-02-01",
    token: required("SANITY_API_WRITE_TOKEN"),
    useCdn: false,
  });
}

/**
 * A run identifier that sorts, reads as a date, and is stable across the
 * stages of one run. It lands on every document the run creates, in
 * `research.runId`, which is what makes "show me everything the September
 * pipeline published" a query rather than an archaeology project.
 */
export function runId(date = new Date()): string {
  return `run-${date.toISOString().slice(0, 10)}`;
}

/** Sanity array members need a `_key`; without one the Studio cannot reorder. */
export function key(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/**
 * Upsert by slug rather than by id.
 *
 * Sanity's guidance is to let it generate `_id` and to find documents by a
 * content field instead, which is exactly right for a pipeline that may run
 * twice. Deriving `_id` from the slug would look tidier and would mean a
 * renamed slug silently creates a second document while the first one keeps
 * ranking.
 */
export async function upsertBySlug(
  client: SanityClient,
  type: string,
  slug: string,
  fields: Record<string, unknown>,
  /**
   * Written only when the document does not already have them.
   *
   * For values this run could only guess at. The case that forced it: a guide
   * created from a real trend measurement, re-run months later when its query
   * no longer produces a brief because the guide itself now covers it. The
   * fallback provenance is strictly worse than what is already stored, and
   * `set` would happily overwrite a measured score with a guess. Anything the
   * run is not confident about belongs here rather than in `fields`.
   */
  ifMissing: Record<string, unknown> = {},
): Promise<{ _id: string; created: boolean }> {
  const existing = await client.fetch<string | null>(
    `*[_type == $type && slug.current == $slug][0]._id`,
    { type, slug },
  );

  if (existing) {
    /* Patch rather than replace: an editor may have fixed a sentence since the
       last run, and a pipeline that stamps over human edits gets turned off
       within a week. Only the fields this run actually computed are set. */
    let patch = client.patch(existing).set(fields);
    if (Object.keys(ifMissing).length) patch = patch.setIfMissing(ifMissing);
    await patch.commit();
    return { _id: existing, created: false };
  }

  const created = await client.create({
    _type: type,
    slug: { _type: "slug", current: slug },
    ...fields,
    ...ifMissing,
  });
  return { _id: created._id, created: true };
}
