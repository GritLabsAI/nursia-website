import { defineField, defineType } from "sanity";

/**
 * A question the body cannot answer without turning into a list.
 *
 * These render as visible copy *and* as FAQPage schema, in that order and
 * never the other way round — markup describing an answer a reader cannot see
 * on the page is the exact pattern Google penalises, and it is also just a
 * lie. The answer field is plain text on purpose: it has to survive being
 * lifted verbatim into a rich result or read aloud by an assistant.
 */
export const faq = defineType({
  name: "faq",
  title: "Question",
  type: "object",
  fields: [
    defineField({
      name: "q",
      title: "Question",
      type: "string",
      description: "Phrased the way somebody would type or say it.",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "a",
      title: "Answer",
      type: "text",
      rows: 3,
      description:
        "Answer in the first sentence, then justify it. Two or three sentences — this gets quoted whole or not at all.",
      validation: (rule) =>
        rule
          .required()
          .max(400)
          .warning("Over ~400 characters it stops being quotable as a snippet."),
    }),
  ],
  preview: {
    select: { title: "q", subtitle: "a" },
  },
});
