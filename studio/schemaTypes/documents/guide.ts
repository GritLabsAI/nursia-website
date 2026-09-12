import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "../shared/seoFields";

/**
 * An SEO page, which on this site means a real answer with real questions in it.
 *
 * The shape is not a blog post and should not drift into one. `shortAnswer`
 * answers the query outright in the first sixty words, `sections` argue in the
 * order somebody actually asks, `faqs` catch the phrasings prose cannot hold,
 * and `topic` is the question set the guide has to earn its keep by sending
 * readers to. Every one of those is a separate field because a separate thing
 * reads it — a snippet, an outline, a rich result, an internal link.
 *
 * `leadMagnet` is what turns a ranked page into a signup. A guide without one
 * is allowed, and it is also a page that collects nothing.
 */
export const guide = defineType({
  name: "guide",
  title: "Guide",
  type: "document",
  icon: DocumentTextIcon,
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
      validation: (rule) => rule.required().max(70),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      description:
        "Lives at /guides/<slug> forever. Changing it on a page that ranks throws away the ranking, so change it only before publishing.",
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
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: "cluster",
      title: "Where it sits in the journey",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Before the exam — eligibility, booking, planning", value: "before" },
          { title: "During — the test day and the engine", value: "during" },
          { title: "Content — what to study", value: "content" },
          { title: "After — results, licensure, what next", value: "after" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortAnswer",
      title: "Short answer",
      type: "text",
      rows: 4,
      group: "content",
      description:
        "The first sixty words, written to answer the query outright and survive being lifted whole into a snippet or read aloud. Say the answer, then qualify it — never the other way round.",
      validation: (rule) =>
        rule
          .required()
          .min(120)
          .max(520)
          .warning(
            "Aim for roughly 40-70 words. Shorter reads as a stub; longer will not be quoted.",
          ),
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "guideSection" })],
      validation: (rule) =>
        rule.required().min(2).error("A guide with one section is a paragraph."),
    }),
    defineField({
      name: "faqs",
      title: "Common questions",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "faq" })],
      description:
        "Rendered as visible copy and as FAQPage schema. Never schema-only.",
    }),
    defineField({
      name: "minutes",
      title: "Reading time",
      type: "number",
      group: "content",
      description:
        "Minutes. Set by the pipeline from the word count; override if it reads wrong.",
      validation: (rule) => rule.required().min(1).max(40),
    }),

    defineField({
      name: "leadMagnet",
      title: "Free resource on this page",
      type: "reference",
      group: "convert",
      to: [{ type: "leadMagnet" }],
      description:
        "The thing a reader makes an account to get. Pick the one that matches what this page is about — a generic resource on a specific page converts like a banner ad.",
    }),
    defineField({
      name: "experiment",
      title: "Running an experiment",
      type: "reference",
      group: "convert",
      to: [{ type: "experiment" }],
      description:
        "Optional. Assigns readers of this page to variants of the conversion copy and records which one they saw.",
    }),

    defineField({
      name: "topic",
      title: "Practise this",
      type: "reference",
      group: "connect",
      to: [{ type: "topic" }],
      description:
        "The question set this guide sends readers to. Required, because a guide that links to no practice is a page that ranks, gets read, and ends.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "readNext",
      title: "Read next",
      type: "array",
      group: "connect",
      of: [defineArrayMember({ type: "reference", to: [{ type: "guide" }] })],
      description:
        "Three guides. These are the internal links that spread authority around the cluster, so point them at pages in the same cluster or one step along the journey — not at whatever was written most recently.",
      validation: (rule) =>
        rule
          .max(4)
          .unique()
          .custom((refs, context) => {
            const self = (context.document?._id ?? "").replace(/^drafts\./, "");
            const list = (refs ?? []) as { _ref?: string }[];
            return list.some((r) => r._ref === self)
              ? "A guide cannot be its own read-next."
              : true;
          }),
    }),

    defineField({
      name: "relatedReviews",
      title: "Revise the subject",
      type: "array",
      group: "connect",
      of: [defineArrayMember({ type: "reference", to: [{ type: "seoPage" }] })],
      description:
        "Review pages on the subject this guide touches. These are outbound links from a page that already ranks into a newer one, which is the only reason a newly published review page gets crawled promptly — the sitemap alone is not enough. Two is plenty; this rail is not the point of the guide.",
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
        "Move this when the content changes, not when a typo is fixed. It becomes dateModified and the sitemap lastmod, and a date that moves for nothing teaches crawlers to ignore the field.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "research",
      type: "research",
      group: "meta",
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
      title: "Journey stage",
      name: "cluster",
      by: [
        { field: "cluster", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      cluster: "cluster",
      magnet: "leadMagnet.title",
    },
    prepare: ({ title, cluster, magnet }) => ({
      title,
      subtitle: magnet ? `${cluster} — ${magnet}` : `${cluster} — no free resource`,
    }),
  },
});
