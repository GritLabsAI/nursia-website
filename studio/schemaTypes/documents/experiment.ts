import { SplitHorizontalIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A funnel experiment, defined by whoever is running it rather than by a deploy.
 *
 * The variants carry *copy and placement*, not code. That is the line: an
 * experiment can change what the gate says, where it sits, and how much of the
 * page comes before it, because those are the things that actually move a
 * signup rate and the things a marketer should be able to change on a Tuesday.
 * Anything that needs new behaviour needs a pull request, and that is fine —
 * it is rarer than it sounds.
 *
 * Assignment is sticky per browser and deterministic (see src/lib/experiment.ts),
 * so a reader who comes back sees the same variant and the numbers are not
 * quietly poisoned by people flipping between arms.
 *
 * The fields that look like bureaucracy — `hypothesis`, `metric`,
 * `minimumSample` — are the ones that stop a test being read too early. A
 * result called at 40 signups is a coin flip with a slide deck.
 */
export const experiment = defineType({
  name: "experiment",
  title: "Funnel experiment",
  type: "document",
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      description: "What you would call it in a standup.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "key",
      title: "Event key",
      type: "slug",
      options: { source: "title", maxLength: 40 },
      description:
        "Short and stable — it is the dimension name in GA4, so renaming it after launch splits the report in two.",
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return "Required";
          return (
            /^[a-z0-9_]+$/.test(slug.current) ||
            "Lowercase letters, numbers and underscores — it has to survive being a GA4 parameter."
          );
        }),
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Draft — not being served", value: "draft" },
          { title: "Running", value: "running" },
          { title: "Finished — serving the winner", value: "finished" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hypothesis",
      type: "text",
      rows: 3,
      description:
        "Written as a prediction with a reason: we think X will beat Y because Z. If you cannot name the reason, the test will not teach you anything whichever way it lands.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "metric",
      title: "What decides it",
      type: "string",
      options: {
        list: [
          { title: "Signups per reader of the page", value: "signup_rate" },
          { title: "Clicks on the gate", value: "gate_click_rate" },
          { title: "Resource unlocks", value: "unlock_rate" },
          { title: "Signups that then answer a question", value: "activated_rate" },
        ],
      },
      description:
        "One metric, chosen before the test runs. Picking the winner afterwards from whichever number moved is how teams ship changes that do nothing.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "minimumSample",
      title: "Do not read it before",
      type: "number",
      description:
        "Readers per variant. A rough guard against calling a winner off forty visits — not a substitute for a significance test.",
      initialValue: 1000,
      validation: (rule) => rule.min(100),
    }),
    defineField({
      name: "variants",
      type: "array",
      of: [defineArrayMember({ type: "experimentVariant" })],
      description:
        "The first variant is the control. Weights are relative, so two variants at 50 and 50 is the same split as 1 and 1.",
      validation: (rule) =>
        rule
          .required()
          .min(2)
          .error("An experiment needs a control and at least one challenger."),
    }),
    defineField({
      name: "notes",
      title: "What happened",
      type: "text",
      rows: 4,
      description:
        "Filled in when the test finishes. The losing tests are the valuable ones and they are the ones nobody writes down.",
    }),
  ],
  preview: {
    select: { title: "title", status: "status", metric: "metric" },
    prepare: ({ title, status, metric }) => ({
      title,
      subtitle: `${status} — decided on ${metric ?? "nothing yet"}`,
    }),
  },
});

/**
 * One arm of a test.
 *
 * Everything is optional except the key: an unset field means "use whatever the
 * page would have done anyway", which is what makes the control variant an
 * empty object rather than a copy of the defaults that silently goes stale.
 */
export const experimentVariant = defineType({
  name: "experimentVariant",
  title: "Variant",
  type: "object",
  fields: [
    defineField({
      name: "key",
      type: "string",
      description: "Short, e.g. control, urgency, proof. Ends up in GA4 as-is.",
      validation: (rule) =>
        rule.required().custom((value) =>
          /^[a-z0-9_]+$/.test(value ?? "")
            ? true
            : "Lowercase letters, numbers and underscores.",
        ),
    }),
    defineField({
      name: "weight",
      type: "number",
      initialValue: 50,
      validation: (rule) => rule.required().min(0).max(100),
    }),
    defineField({
      name: "headline",
      title: "Gate headline",
      type: "string",
      description: "Empty means the resource's own headline.",
    }),
    defineField({
      name: "body",
      title: "Gate copy",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "ctaLabel",
      title: "Button",
      type: "string",
    }),
    defineField({
      name: "placement",
      title: "Where the gate sits",
      type: "string",
      options: {
        list: [
          { title: "After the second section", value: "mid" },
          { title: "At the end of the guide", value: "end" },
          { title: "Both", value: "both" },
        ],
      },
      description:
        "The single biggest lever on this page type, and the one most worth testing first.",
    }),
  ],
  preview: {
    select: { title: "key", subtitle: "headline", weight: "weight" },
    prepare: ({ title, subtitle, weight }) => ({
      title: `${title} (${weight ?? 0})`,
      subtitle: subtitle || "inherits the resource copy",
    }),
  },
});
