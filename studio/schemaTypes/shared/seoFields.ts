import { defineField } from "sanity";

/**
 * The overrides, and only the overrides.
 *
 * Every one of these has a sensible answer already — the title, the short
 * answer, the slug. These fields exist for the cases where the honest page
 * title is the wrong thing to put in a result, which is rarer than most
 * content teams believe. Left empty, the page computes its own, which is why
 * they are all optional and why the descriptions say what happens if you do
 * nothing.
 */
export const seoFields = [
  defineField({
    name: "seo",
    title: "Search overrides",
    type: "object",
    options: { collapsible: true, collapsed: true },
    fields: [
      defineField({
        name: "title",
        title: "Title tag",
        type: "string",
        description:
          "Leave empty to use the page title. Google rewrites about two thirds of these anyway, so only set it when the page title genuinely reads wrong in a result.",
        validation: (rule) =>
          rule.max(60).warning("Past ~60 characters it gets truncated in results."),
      }),
      defineField({
        name: "description",
        title: "Meta description",
        type: "text",
        rows: 2,
        description:
          "Leave empty to use the short answer, trimmed on a sentence. Assistants quote this verbatim, so a half-sentence here reads as a scraped page.",
        validation: (rule) =>
          rule.max(160).warning("Past ~160 characters it gets truncated in results."),
      }),
      defineField({
        name: "noIndex",
        title: "Keep out of search",
        type: "boolean",
        description:
          "For a page that exists to serve an ad campaign or an experiment, where an indexed duplicate would compete with the real page.",
        initialValue: false,
      }),
    ],
  }),
];
