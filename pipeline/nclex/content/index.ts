import type { Draft } from "../lib/drafts";
import { BATCH_01 } from "./batch-01";

/**
 * Every written page, in the batches they were written in.
 *
 * Batched by when they were written rather than by subject, because a batch is
 * the unit that gets reviewed: ten pages is a readable pull request and a
 * hundred is not. Subject grouping is what the store and the Studio are for.
 *
 * The compile stage checks this list against the planned pages, so a draft
 * whose slug is not in the plan fails loudly rather than publishing something
 * nobody decided to write.
 */
export const DRAFTS: Draft[] = [...BATCH_01];
