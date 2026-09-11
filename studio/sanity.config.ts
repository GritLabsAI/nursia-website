import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";

/**
 * The Studio runs standalone on :3333 rather than mounted inside the Next.js
 * app. That is the Sanity recommendation and it earns it here: the Studio
 * builds on Vite in a second or two, it picks up its own updates without a
 * redeploy of the website, and — the part that actually matters day to day —
 * TypeGen watches the Next.js app's queries while `sanity dev` is running, so
 * a changed GROQ query re-types the frontend without anyone remembering to
 * run a script.
 */
export default defineConfig({
  name: "nursia",
  title: "Nursia",
  projectId: "z92ivzd6",
  dataset: "production",
  plugins: [
    structureTool({ structure }),
    /* Vision is where you test a GROQ query before it goes near a page. */
    visionTool({ defaultApiVersion: "2026-02-01" }),
  ],
  schema: { types: schemaTypes },
  document: {
    /* The content library is the product surface — a new guide should be
       started from the pipeline or from the Guides list, not from a "create
       new" menu that offers every object type in the schema. */
    newDocumentOptions: (prev) =>
      prev.filter((item) =>
        ["guide", "leadMagnet", "experiment", "author", "topic"].includes(
          item.templateId,
        ),
      ),
  },
});
