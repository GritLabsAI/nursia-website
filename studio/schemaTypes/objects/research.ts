import { defineField, defineType } from "sanity";

/**
 * Why this page exists.
 *
 * Every guide the pipeline creates carries the evidence that put it on the
 * list: the query it targets, how that query was scoring when it was picked,
 * and which run picked it. Without this the library becomes forty pages
 * nobody can defend — you cannot tell a guide that earned its slot from one
 * somebody felt like writing, and you cannot re-run the research later and
 * see what has decayed.
 *
 * It is editorial metadata, not a ranking promise. Nothing here is rendered.
 */
export const research = defineType({
  name: "research",
  title: "Why this page exists",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "primaryQuery",
      title: "Target query",
      type: "string",
      description:
        "The one search this page is trying to be the best answer to. One query, not a list — a page aimed at four things ranks for none of them.",
    }),
    defineField({
      name: "secondaryQueries",
      title: "Also answers",
      type: "array",
      of: [{ type: "string" }],
      description:
        "Long-tail phrasings the same page can legitimately satisfy. These usually become FAQ entries.",
      options: { layout: "tags" },
    }),
    defineField({
      name: "intent",
      title: "What the searcher wants",
      type: "string",
      options: {
        list: [
          { title: "Answer a question", value: "informational" },
          { title: "Compare the options", value: "comparison" },
          { title: "Do a task", value: "transactional" },
          { title: "Find a specific thing", value: "navigational" },
        ],
        layout: "radio",
      },
      description:
        "Decides the shape of the page and which free resource belongs on it.",
    }),
    defineField({
      name: "trendScore",
      title: "Interest score when picked",
      type: "number",
      description:
        "0-100, the Google Trends interest value at selection time. A snapshot, not a live number.",
      validation: (rule) => rule.min(0).max(100),
    }),
    defineField({
      name: "trajectory",
      title: "Direction of travel",
      type: "string",
      options: {
        list: [
          { title: "Rising", value: "rising" },
          { title: "Steady", value: "steady" },
          { title: "Seasonal", value: "seasonal" },
          { title: "Declining", value: "declining" },
        ],
      },
      description:
        "Rising and seasonal queries are worth publishing early. Declining ones need a reason beyond volume.",
    }),
    defineField({
      name: "source",
      title: "Where the number came from",
      type: "string",
      description:
        "Which adapter produced it — google-trends, keyword-csv, or editorial. Says how much to trust the score.",
    }),
    defineField({
      name: "runId",
      title: "Pipeline run",
      type: "string",
      description: "The seeding run that created this document, e.g. run-2026-09-11.",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "primaryQuery", subtitle: "runId" },
  },
});
