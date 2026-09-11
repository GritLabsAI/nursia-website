import Link from "next/link";
import { PortableText, type PortableTextComponents } from "next-sanity";
import type { TypedObject } from "@portabletext/types";

/**
 * Body copy out of Sanity, rendered into the existing prose styles.
 *
 * Nothing here introduces a new visual language: `.prose-ns` in globals.css
 * already styles paragraphs, headings and lists for these templates, and the
 * job of this file is to hand it the right elements rather than to decorate
 * them. Every component below exists because the default would be wrong, not
 * to add a flourish.
 *
 * The interesting one is `internalLink`. The GROQ query resolves those
 * annotations down to a document type and a slug (see src/sanity/queries.ts),
 * so by the time markup is being produced the link is already a path and
 * nothing has to be dereferenced mid-render. That keeps a guide with twelve
 * internal links at one query rather than thirteen.
 */

const components: PortableTextComponents = {
  block: {
    /* h3 only. The page owns h1, and h2 is the section heading field — letting
       an editor produce either from inside body copy would put the document
       outline out of step with the schema and the "on this page" rail. */
    h3: ({ children }) => <h3>{children}</h3>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    normal: ({ children }) => <p>{children}</p>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,

    internalLink: ({ value, children }) => {
      const { docType, slug } = (value ?? {}) as {
        docType?: string;
        slug?: string;
      };
      /* A reference to a deleted document resolves to nothing. Render the words
         rather than a link to /guides/undefined — a broken sentence is worse
         than a missing link, and a 404 from our own body copy is worse still. */
      if (!slug) return <>{children}</>;

      const href =
        docType === "topic"
          ? `/nclex-practice-questions/${slug}`
          : `/guides/${slug}`;
      return <Link href={href}>{children}</Link>;
    },

    link: ({ value, children }) => {
      const { href, rel } = (value ?? {}) as { href?: string; rel?: boolean };
      if (!href) return <>{children}</>;
      return (
        <a
          href={href}
          target="_blank"
          rel={`noopener noreferrer${rel ? " nofollow" : ""}`}
        >
          {children}
        </a>
      );
    },
  },
};

/**
 * Generic over the block type on purpose.
 *
 * TypeGen derives the block shape from the schema and the query, and what it
 * produces is *narrower* than the library's `PortableTextBlock` in some places
 * and looser in others — `children` comes back optional, because GROQ can
 * return a block whose children were never set. Pinning the prop to
 * `PortableTextBlock[]` would mean casting at every call site, which is three
 * casts that each have to be re-justified. Accepting whatever typed objects
 * the query returned keeps the generated types flowing through intact and puts
 * the single widening in one place, here.
 */
export function PortableBody<B extends TypedObject>({
  value,
}: {
  value: readonly B[] | null | undefined;
}) {
  if (!value?.length) return null;
  return (
    <PortableText<B>
      value={value as B[]}
      components={components as PortableTextComponents}
    />
  );
}
