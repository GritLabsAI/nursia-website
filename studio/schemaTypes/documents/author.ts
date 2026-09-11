import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * The credential that makes health content quotable.
 *
 * A reference rather than a string on each guide, because the whole point is
 * that it is the *same* named nurse across forty pages. Google's guidance on
 * health content, and every assistant trained on it, treats a consistent
 * credentialed author as the difference between a source and a content farm.
 * Retyping "Dana Whitfield, RN, MSN" forty times gets it wrong on page
 * thirty-one and quietly undoes that.
 */
export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "honorific",
      title: "Credentials",
      type: "string",
      description: "Exactly as they are licensed, e.g. RN, MSN, CNE.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "jobTitle",
      type: "string",
      description: "e.g. Lead item writer. Renders in the byline and in schema.",
    }),
    defineField({
      name: "bio",
      type: "text",
      rows: 3,
      description:
        "Two sentences on why this person is worth believing about the NCLEX specifically.",
    }),
    defineField({
      name: "knowsAbout",
      title: "Subject expertise",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "Feeds schema.org knowsAbout. Subjects, not adjectives.",
    }),
    defineField({
      name: "sameAs",
      title: "Profiles elsewhere",
      type: "array",
      of: [{ type: "url" }],
      description:
        "A licence lookup, a university page, LinkedIn. This is what lets a machine confirm the person is real.",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "honorific" },
  },
});
