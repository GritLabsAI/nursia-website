import { defineCliConfig } from "sanity/cli";

/**
 * TypeGen runs from here, and it writes into the *Next.js app*, not the
 * Studio. The queries live next to the pages that use them, so that is where
 * the generated types have to land for `client.fetch()` to come back typed.
 */
export default defineCliConfig({
  api: {
    projectId: "z92ivzd6",
    dataset: "production",
  },
  typegen: {
    enabled: true,
    path: "../src/**/*.{ts,tsx}",
    schema: "schema.json",
    generates: "../src/sanity.types.ts",
    overloadClientMethods: true,
  },
});
