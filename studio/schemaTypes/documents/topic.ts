import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * A question set, as content.
 *
 * The questions themselves stay in the repo — they are versioned, reviewed in
 * pull requests, and shipped into static HTML, and none of that should move
 * into a CMS. What lives here is the editorial wrapper around a set: its
 * name, what it covers, how it is introduced, and which guides point at it.
 *
 * `slug` is the contract between the two halves. It matches the slug in
 * src/lib/content.ts, and the seeding pipeline refuses to create a topic that
 * has no question set behind it — a topic page with an empty set is a
 * crawlable dead end and it converts nobody.
 */
export const topic = defineType({
  name: "topic",
  title: "Question topic",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      description:
        "Must match a topic slug in src/lib/content.ts — this is what ties the page to its question bank.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "h1",
      title: "Page heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "NCSBN client-need category",
      type: "string",
      description: "Verbatim from the test plan. It is quoted in schema.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "group",
      type: "string",
      options: {
        list: [
          { title: "Client-need category", value: "category" },
          { title: "Clinical subject", value: "subject" },
          { title: "Item format", value: "format" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "blurb",
      type: "text",
      rows: 2,
      description: "One sentence, used on cards and in listings.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      type: "text",
      rows: 4,
      description: "The paragraph above the questions on the topic page.",
    }),
    defineField({
      name: "share",
      title: "Share of the exam",
      type: "string",
      description:
        "As the test plan words it, e.g. '10-16%'. A range, because NCSBN publishes a range.",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "category" },
  },
});
