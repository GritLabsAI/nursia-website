import { key } from "./sanity";

/**
 * Plain paragraphs in, Portable Text out.
 *
 * The existing guides store body copy as `string[]` — one paragraph per entry,
 * no markup. That was the right shape for a file nobody but an engineer would
 * open. It is the wrong shape for a CMS, where an editor will eventually need
 * to link a sentence to another guide or emphasise a lab value, and where
 * doing that in a plain string means inventing a markup language in a text
 * field.
 *
 * So the migration lifts every paragraph into a block. Nothing is lost and
 * nothing is invented: no headings are guessed, no lists are detected, no
 * emphasis is inferred. A paragraph goes in and a paragraph comes out. The
 * moment you start pattern-matching prose into structure you start silently
 * mangling sentences that happened to begin with a dash.
 */

export type Block = {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: never[];
  children: { _type: "span"; _key: string; text: string; marks: never[] }[];
};

export function toPortableText(paragraphs: readonly string[]): Block[] {
  return paragraphs
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      _type: "block" as const,
      _key: key(),
      style: "normal" as const,
      markDefs: [],
      children: [
        { _type: "span" as const, _key: key(), text, marks: [] },
      ],
    }));
}

/** Words in a set of paragraphs — used to set reading time honestly. */
export function countWords(paragraphs: readonly string[]): number {
  return paragraphs.reduce(
    (n, p) => n + p.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

/**
 * Reading time, rounded the way a reader experiences it.
 *
 * 220 words a minute is the usual figure for adult non-fiction and it is about
 * right for this material. Rounding up rather than to nearest, and flooring at
 * one, because a guide that says "0 min" reads as broken and one that
 * understates is a small breach of trust at the top of the page.
 */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 220));
}
