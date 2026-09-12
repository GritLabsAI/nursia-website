import { BookIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "../shared/seoFields";

/**
 * A review page: one exam subject, answered at the depth a candidate needs the
 * week before the test.
 *
 * A separate type from `guide` rather than a flag on it, and the reason is
 * editorial rather than technical. A guide is a piece of journey writing — how
 * to register, what the result means — written one at a time and argued in
 * prose. A review page is a reference for one subject, produced in batches from
 * a keyword programme, and read by somebody who is revising rather than
 * deciding. They want different bodies, they go stale on different schedules,
 * and the Studio lists that make guides manageable ("not converting", "going
 * stale") would be swamped if a hundred review pages joined them.
 *
 * What the two types deliberately share is the conversion architecture:
 * `leadMagnet`, `experiment` and `topic` mean exactly what they mean on a
 * guide, are matched by the same rules, and render through the same components.
 * A reader landing here from a search result gets the same offer they would get
 * on a guide, which is the entire point of publishing these at all.
 *
 * The fields that are not on a guide earn their place:
 *
 *   `kind`        decides the body shape — a practice page and a medication page
 *                 argue in different orders, and the template reads this.
 *   `keyPoints`   the four or five claims a revising reader takes if they read
 *                 nothing else. Above the fold, and the thing an assistant lifts.
 *   `examTip`     where the exam's phrasing differs from the ward's. This is the
 *                 page's reason to exist over a textbook.
 *   `relatedGuides` outbound links into the hand-written library, so a hundred
 *                 new pages feed the cluster that already ranks instead of
 *                 forming an island beside it.
 */
export const seoPage = defineType({
  name: "seoPage",
  title: "Review page",
  type: "document",
  icon: BookIcon,
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
        "Lives at /nclex-review/<slug> forever. Changing it on a page that ranks throws away the ranking, so change it only before publishing.",
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
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: "kind",
      title: "What kind of page this is",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Practice — how the exam asks about this", value: "practice" },
          { title: "Review — what is actually tested", value: "review" },
          { title: "Clinical — nursing care for a condition", value: "clinical" },
          { title: "Medication — a drug class", value: "medication" },
          { title: "Strategy — a way of answering", value: "strategy" },
        ],
      },
      description:
        "Decides the shape of the body, not the styling. Changing it after the page is written will leave the sections arguing in the wrong order.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "examCategory",
      title: "Test plan category",
      type: "string",
      group: "content",
      description:
        "The NCLEX-RN test plan category this subject sits in, as NCSBN names it. Shown on the page and used to group the index.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "cluster",
      title: "Where it sits in the journey",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Before the exam", value: "before" },
          { title: "During — the test day and the engine", value: "during" },
          { title: "Content — what to study", value: "content" },
          { title: "After — results, licensure, what next", value: "after" },
        ],
      },
      initialValue: "content",
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
      name: "keyPoints",
      title: "What to take away",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "string" })],
      description:
        "Four or five claims, each a complete sentence that is true on its own. These are what a revising reader keeps and what an assistant quotes, so no fragments and no headings.",
      validation: (rule) =>
        rule
          .required()
          .min(3)
          .max(6)
          .custom((points) =>
            (points ?? []).every((p) => typeof p === "string" && p.trim().length > 30)
              ? true
              : "Each point should be a full sentence, not a label.",
          ),
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "guideSection" })],
      validation: (rule) =>
        rule.required().min(2).error("A page with one section is a paragraph."),
    }),
    defineField({
      name: "examTip",
      title: "Where the exam differs from the ward",
      type: "text",
      rows: 3,
      group: "content",
      description:
        "The one place the textbook answer and the exam answer come apart — or the phrasing the item writers reuse. This is why somebody reads this page instead of a chapter; leave it empty rather than filling it with a platitude.",
      validation: (rule) => rule.max(600),
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
      description: "Minutes. Set by the pipeline from the word count.",
      validation: (rule) => rule.required().min(1).max(40),
    }),

    defineField({
      name: "leadMagnet",
      title: "Free resource on this page",
      type: "reference",
      group: "convert",
      to: [{ type: "leadMagnet" }],
      description:
        "The thing a reader makes an account to get. Pick the one that matches the subject — a generic resource on a specific page converts like a banner ad.",
    }),
    defineField({
      name: "experiment",
      title: "Running an experiment",
      type: "reference",
      group: "convert",
      to: [{ type: "experiment" }],
      description:
        "Optional. Assigns readers to variants of the conversion copy and records which one they saw.",
    }),

    defineField({
      name: "topic",
      title: "Practise this",
      type: "reference",
      group: "connect",
      to: [{ type: "topic" }],
      description:
        "The question set this page sends readers to. Required, because a review page that links to no practice is a page that ranks, gets read, and ends.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "readNext",
      title: "Read next",
      type: "array",
      group: "connect",
      of: [defineArrayMember({ type: "reference", to: [{ type: "seoPage" }] })],
      description:
        "Other review pages, ideally in the same test plan category. These are the links that spread authority through the new cluster.",
      validation: (rule) =>
        rule
          .max(4)
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
        "Links out into the hand-written library. Two is plenty: they exist so this page feeds the cluster that already ranks rather than sitting beside it.",
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
        "Move this when the content changes, not when a typo is fixed. It becomes dateModified and the sitemap lastmod.",
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
      title: "Test plan category",
      name: "category",
      by: [
        { field: "examCategory", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      kind: "kind",
      category: "examCategory",
      magnet: "leadMagnet.title",
    },
    prepare: ({ title, kind, category, magnet }) => ({
      title,
      subtitle: magnet
        ? `${kind} — ${category}`
        : `${kind} — ${category} — no free resource`,
    }),
  },
});
