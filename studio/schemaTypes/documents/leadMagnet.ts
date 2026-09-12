import { PackageIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * The free thing, and the account it costs.
 *
 * There is no separate mailing list here and that is deliberate. A resource
 * that trades an email for a PDF builds a list of addresses attached to
 * nobody; the same trade for an *account* builds a list of people whose
 * answers we can keep, whose weak categories we can name, and who can be
 * brought back to a page that already knows them. So unlocking a resource
 * and signing up are one action, and every lead is a real user in Firebase
 * Auth rather than a row in a CRM nobody opens.
 *
 * What that buys editorially: the resource has to be worth an account, not
 * worth an email. A two-page PDF of things already in the guide is not. The
 * `promise` field is where that gets decided, and it is required.
 */
export const leadMagnet = defineType({
  name: "leadMagnet",
  title: "Free resource",
  type: "document",
  icon: PackageIcon,
  groups: [
    { name: "what", title: "The resource", default: true },
    { name: "gate", title: "The ask" },
    { name: "delivery", title: "Delivery" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "what",
      description:
        "What it is, concretely. 'The 14-day NCLEX plan' beats 'Free study guide'.",
      validation: (rule) => rule.required().max(70),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "what",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      title: "Format",
      type: "string",
      group: "what",
      options: {
        list: [
          { title: "Checklist", value: "checklist" },
          { title: "Plan or schedule", value: "plan" },
          { title: "Cheat sheet", value: "cheatsheet" },
          { title: "Question pack", value: "questionPack" },
          { title: "Worked examples", value: "worked" },
          { title: "Template", value: "template" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "promise",
      title: "Why it is worth an account",
      type: "text",
      rows: 2,
      group: "what",
      description:
        "One sentence naming the specific thing the reader can do afterwards that they could not do before. If the honest answer is 'read a summary of the page above', the resource is not ready.",
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "contains",
      title: "What is in it",
      type: "array",
      of: [{ type: "string" }],
      group: "what",
      description:
        "Three to five specifics, shown on the gate. Countable beats adjectival: '38 lab values with the numbers that matter' beats 'comprehensive lab reference'.",
      validation: (rule) =>
        rule.min(2).error("Two is the minimum that reads as a real resource.").max(6),
    }),

    defineField({
      name: "headline",
      title: "Gate headline",
      type: "string",
      group: "gate",
      description: "Leave empty to use the resource title.",
    }),
    defineField({
      name: "body",
      title: "Gate copy",
      type: "text",
      rows: 3,
      group: "gate",
      description:
        "Says what an account costs — an email and a password, no card — because the unspoken fear at this step is a paywall.",
    }),
    defineField({
      name: "ctaLabel",
      title: "Button",
      type: "string",
      group: "gate",
      initialValue: "Unlock it free →",
      validation: (rule) => rule.required().max(32),
    }),

    defineField({
      name: "delivery",
      title: "How the reader gets it",
      type: "string",
      group: "delivery",
      options: {
        list: [
          { title: "A page on this site", value: "page" },
          { title: "A file to download", value: "file" },
          { title: "Unlocks a question set", value: "practice" },
        ],
        layout: "radio",
      },
      initialValue: "page",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "file",
      title: "The file",
      type: "file",
      group: "delivery",
      hidden: ({ parent }) => parent?.delivery !== "file",
    }),
    defineField({
      name: "destination",
      title: "Where it sends them",
      type: "string",
      group: "delivery",
      description:
        "A path on this site, e.g. /resources/lab-values or /nclex-practice-questions/pharmacology.",
      hidden: ({ parent }) => parent?.delivery === "file",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { delivery?: string } | undefined;
          if (parent?.delivery === "file") return true;
          if (!value) return "Needed for anything that is not a file download.";
          return value.startsWith("/") || "Must be a path on this site, starting with /.";
        }),
    }),
    defineField({
      name: "content",
      title: "The resource itself",
      type: "richText",
      group: "delivery",
      description:
        "For a resource delivered as a page. This is what appears once the reader has an account.",
      hidden: ({ parent }) => parent?.delivery !== "page",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "promise", kind: "kind" },
    prepare: ({ title, subtitle, kind }) => ({
      title,
      subtitle: `${kind ?? "resource"} — ${subtitle ?? ""}`,
    }),
  },
});
