import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "./studio/schemaTypes";
import { structure } from "./studio/structure";

/**
 * The Studio, mounted inside the Next.js app at /studio.
 *
 * This replaces the standalone-only arrangement, and the reason is operational
 * rather than technical: the Studio on :3333 is reachable from the machine it
 * is running on and nowhere else. An editor who is not sitting at this laptop
 * has no way in, which makes "an editor can fix a wrong fee without waiting for
 * an engineer" — the entire argument for having a CMS — untrue in practice.
 * Mounted here it deploys with the site and lives at nursia.io/studio.
 *
 * The schema and the structure are imported from `studio/` rather than copied.
 * They are the same documents either way, and two definitions of one schema is
 * the kind of duplication that stays in sync for a fortnight.
 *
 * `studio/sanity.config.ts` still exists and still works. Keep it: `sanity dev`
 * is faster to iterate on for schema work, and — the part that actually matters
 * day to day — TypeGen watches the Next.js app's queries while it runs, so a
 * changed GROQ query re-types the frontend without anyone remembering to run a
 * script. The two configs must be kept in step, which is why almost everything
 * in both is an import rather than a literal.
 *
 * One thing to know: the root app resolves `sanity` at 6.x and `studio/` has
 * its own 4.x. The schema files use `defineType`, `defineField` and
 * `defineArrayMember`, whose signatures are stable across both, so they load
 * under either runtime. If that stops being true, aligning the two versions is
 * the fix rather than forking the schema.
 */
export default defineConfig({
  name: "nursia",
  title: "Nursia",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "z92ivzd6",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",

  /* Where the Studio lives once it is mounted. It has to match the route
     segment in src/app/studio, or every internal link in the Studio points at
     a 404. */
  basePath: "/studio",

  plugins: [
    structureTool({ structure }),
    /* Vision is where you test a GROQ query before it goes near a page. */
    visionTool({ defaultApiVersion: "2026-02-01" }),
  ],
  schema: { types: schemaTypes },
  document: {
    /*
     * The content library is the product surface — a new guide should be
     * started from the pipeline or from the Guides list, not from a "create
     * new" menu offering every object type in the schema.
     *
     * `nursingPage` and `seoPage` are deliberately absent. Both are produced in
     * batches by a pipeline that owns their slugs, their provenance and their
     * internal links; one made by hand in the Studio would have none of those
     * and would be invisible to every report that measures the programme.
     * Editing an existing one is expected and unaffected.
     */
    newDocumentOptions: (prev) =>
      prev.filter((item) =>
        ["guide", "leadMagnet", "experiment", "author", "topic"].includes(
          item.templateId,
        ),
      ),
  },
});
