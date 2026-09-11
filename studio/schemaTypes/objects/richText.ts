import { defineArrayMember, defineType } from "sanity";

/**
 * Body copy, everywhere it appears.
 *
 * Deliberately small. The guides argue in prose — the thing that makes them
 * rank is that they answer a question in paragraphs, not that they are a
 * scannable pile of bullets and call-outs. So an editor gets paragraphs, two
 * levels of emphasis, lists, and links, and nothing that lets a page drift
 * into a listicle. H2s are not in here either: they are a field on the
 * section, because the outline is structured data the page reads back out as
 * `articleSection` and as the "on this page" rail.
 */
export const richText = defineType({
  name: "richText",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        /* H3 only. H1 is the page title and H2 is the section field above. */
        { title: "Sub-heading", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bulleted", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
        ],
        annotations: [
          defineArrayMember({
            name: "internalLink",
            title: "Link to a page on this site",
            type: "object",
            fields: [
              {
                name: "reference",
                type: "reference",
                to: [{ type: "guide" }, { type: "topic" }],
                validation: (rule) => rule.required(),
              },
            ],
          }),
          defineArrayMember({
            name: "link",
            title: "Link to another site",
            type: "object",
            fields: [
              {
                name: "href",
                type: "url",
                validation: (rule) =>
                  rule.required().uri({ scheme: ["http", "https"] }),
              },
              {
                name: "rel",
                title: "Tell search engines not to follow",
                type: "boolean",
                description:
                  "On for anything commercial or user-submitted. Off for a regulator, a journal, or NCSBN — those are citations and the link is the point.",
                initialValue: false,
              },
            ],
          }),
        ],
      },
    }),
  ],
});
