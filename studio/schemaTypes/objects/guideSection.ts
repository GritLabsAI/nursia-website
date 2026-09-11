import { defineField, defineType } from "sanity";

/**
 * One argument in the guide, under one heading.
 *
 * The h2 is its own field rather than a style inside the body because three
 * different things read the outline without reading the prose: the Article
 * schema's `articleSection`, the sticky "on this page" rail, and the anchor
 * ids those links point at. Leave headings inside a rich-text blob and all
 * three have to go spelunking for them.
 */
export const guideSection = defineType({
  name: "guideSection",
  title: "Section",
  type: "object",
  fields: [
    defineField({
      name: "h2",
      title: "Heading",
      type: "string",
      description:
        "Written as the thing a reader wants to know, not as a label. 'Where the months actually go' beats 'Timeline'.",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "body",
      type: "richText",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: "h2" },
    prepare: ({ title }) => ({ title: title || "Untitled section" }),
  },
});
