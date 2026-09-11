import { HeartIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "../shared/seoFields";

/**
 * A nursing library page: one clinical subject or one question, answered at
 * the depth a nurse revising for the NCLEX actually needs.
 *
 * A third document type, which needs justifying, because a schema that grows a
 * type per content programme becomes a Studio nobody can navigate.
 *
 * `guide` is journey writing — how to register, what a result means — written
 * one at a time and argued in prose. `seoPage` is the broad subject review at
 * /nclex-review, one page per exam category. This is the long tail underneath
 * both: eight hundred clinical entities and two hundred specific questions, at
 * /nursing. They are produced in one batch, they go stale together, and the
 * Studio lists that make forty guides manageable would be unusable with a
 * thousand of these mixed in. Separate types is what keeps the editorial
 * surface usable; the three are held together by the reference fields below
 * rather than by living in one list.
 *
 * What it deliberately shares with `guide`: `topic`, `leadMagnet` and
 * `experiment` mean exactly what they mean there, are matched by the same
 * rules, and render through the same components. A reader arriving here from a
 * search result gets the same offer they would get on a guide, which is the
 * only reason publishing a thousand pages is worth doing at all.
 *
 * The fields that are not on a guide earn their place:
 *
 *   `family`      what kind of page this is. Clinical entity, exam question,
 *                 practice advice. The template reads it, and so do the hub
 *                 pages that group the library.
 *   `entity`      the clinical thing this page is about, where there is one.
 *                 It is what makes "heart failure" findable as a concept
 *                 rather than only as a slug.
 *   `relatedGuides` outbound links into the hand-written library, so a
 *                 thousand new pages feed the cluster that already ranks
 *                 instead of forming an island beside it.
 *   `quality`     the report the pipeline's gate produced. Kept on the
 *                 document because a page that was published at 640 words with
 *                 a note about a thin section is a page an editor should be
 *                 able to find later, and a number in a log file is a number
 *                 nobody finds.
 */
export const nursingPage = defineType({
  name: "nursingPage",
  title: "Nursing library page",
  type: "document",
  icon: HeartIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "convert", title: "Conversion" },
    { name: "connect", title: "Links" },
    { name: "meta", title: "Provenance & SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      description: "Used in listings, in the tab, and as the default title tag.",
      validation: (rule) => rule.required().max(75),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      description:
        "Lives at /nursing/<slug> forever. Changing it on a page that ranks throws away the ranking, so change it only before publishing.",
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return "Required";
          return (
            /^[a-z0-9-]+$/.test(slug.current) ||
            "Lowercase letters, numbers and hyphens only."
          );
        }),
    }),
    defineField({
      name: "h1",
      title: "Page heading",
      type: "string",
      group: "content",
      description:
        "The heading on the page, which is allowed to be longer and more human than the title.",
      validation: (rule) => rule.required().max(110),
    }),
    defineField({
      name: "family",
      title: "Kind of page",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Clinical — a condition, drug, procedure, lab or skill", value: "clinical" },
          { title: "Practice — how to revise or drill this", value: "practice" },
          { title: "Question — a direct question with a direct answer", value: "faq" },
          { title: "Exam — logistics, rules, results", value: "exam" },
          { title: "Career — licensure, school, the profession", value: "career" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "entity",
      title: "Clinical subject",
      type: "string",
      group: "content",
      description:
        "The condition, drug, procedure or lab value this page is about, spelled as a nurse would say it. Empty on pages that answer a question rather than describe a subject.",
    }),
    defineField({
      name: "shortAnswer",
      title: "Short answer",
      type: "text",
      rows: 4,
      group: "content",
      description:
        "The first sixty words, written to answer outright and survive being lifted whole into a snippet or read aloud. Say the answer, then qualify it — never the other way round.",
      validation: (rule) =>
        rule
          .required()
          .min(120)
          .max(640)
          .warning("Aim for roughly 40-70 words. Shorter reads as a stub; longer will not be quoted."),
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "guideSection" })],
      validation: (rule) =>
        rule.required().min(3).error("A library page with two sections is a stub."),
    }),
    defineField({
      name: "faqs",
      title: "Common questions",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "faq" })],
      description: "Rendered as visible copy and as FAQPage schema. Never schema-only.",
    }),
    defineField({
      name: "minutes",
      title: "Reading time",
      type: "number",
      group: "content",
      validation: (rule) => rule.required().min(1).max(40),
    }),

    defineField({
      name: "leadMagnet",
      title: "Free resource on this page",
      type: "reference",
      group: "convert",
      to: [{ type: "leadMagnet" }],
      description:
        "The thing a reader makes an account to get. Matched to the page's topic by the pipeline; a generic resource on a specific page converts like a banner ad.",
    }),
    defineField({
      name: "experiment",
      title: "Running an experiment",
      type: "reference",
      group: "convert",
      to: [{ type: "experiment" }],
    }),

    defineField({
      name: "topic",
      title: "Practise this",
      type: "reference",
      group: "connect",
      to: [{ type: "topic" }],
      description:
        "The question set this page sends readers to. Required, because a page that links to no practice is a page that ranks, gets read, and ends.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "readNext",
      title: "Read next",
      type: "array",
      group: "connect",
      of: [defineArrayMember({ type: "reference", to: [{ type: "nursingPage" }] })],
      description:
        "Sibling pages in this library. These are what turn a thousand orphans into a crawlable cluster, so they point at pages on the same topic rather than at whatever was written most recently.",
      validation: (rule) =>
        rule
          .max(6)
          .unique()
          .custom((refs, context) => {
            const self = (context.document?._id ?? "").replace(/^drafts\./, "");
            const list = (refs ?? []) as { _ref?: string }[];
            return list.some((r) => r._ref === self)
              ? "A page cannot be its own read-next."
              : true;
          }),
    }),
    defineField({
      name: "relatedGuides",
      title: "Related guides",
      type: "array",
      group: "connect",
      of: [defineArrayMember({ type: "reference", to: [{ type: "guide" }] })],
      description:
        "Links up into the hand-written library. A new page with no inbound link from anything that already ranks is a page a crawler reaches slowly, if at all — the sitemap alone is not enough.",
      validation: (rule) => rule.max(3).unique(),
    }),

    defineField({
      name: "author",
      type: "reference",
      group: "meta",
      to: [{ type: "author" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "reviewedBy",
      title: "Clinically reviewed by",
      type: "reference",
      group: "meta",
      to: [{ type: "author" }],
      description:
        "A second credentialed name. On health content this is the difference between a source and an opinion.",
    }),
    defineField({
      name: "publishedAt",
      title: "First published",
      type: "date",
      group: "meta",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Last substantively updated",
      type: "date",
      group: "meta",
      description:
        "Becomes dateModified and the sitemap lastmod. Move it when the content changes, not when a typo is fixed.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "research",
      type: "research",
      group: "meta",
    }),
    defineField({
      name: "quality",
      title: "Quality report",
      type: "text",
      rows: 3,
      group: "meta",
      readOnly: true,
      description:
        "What the pipeline's gate measured at publication: word count, section count, and how close this page came to another one. Read-only, and worth reading before editing a page that looks thin.",
    }),
    ...seoFields.map((field) => ({ ...field, group: "meta" })),
  ],
  orderings: [
    {
      title: "Recently updated",
      name: "updatedDesc",
      by: [{ field: "updatedAt", direction: "desc" }],
    },
    {
      title: "Subject",
      name: "entity",
      by: [
        { field: "family", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      family: "family",
      entity: "entity",
      minutes: "minutes",
    },
    prepare: ({ title, family, entity, minutes }) => ({
      title,
      subtitle: [entity, family, minutes ? `${minutes} min` : null]
        .filter(Boolean)
        .join(" — "),
    }),
  },
});
