"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

/**
 * The Studio, isolated behind a client boundary.
 *
 * It would be shorter to render `<NextStudio>` straight from `page.tsx`, and
 * that is what Sanity's own example does — but it does not build here. The page
 * module is a Server Component, so importing the config from it pulls the whole
 * `sanity` package into the server graph, and there Turbopack resolves
 * dependencies through the `react-server` export condition. `swr`, which Sanity
 * uses internally, ships a `react-server` build with no default export, so the
 * build fails on `import useSWR from "swr"` inside a Sanity file that never
 * runs on the server in the first place.
 *
 * Marking this file `"use client"` puts the config import in the browser graph
 * where it belongs. The Studio is a client application; the only reason any of
 * it was reaching the server was the import.
 *
 * `page.tsx` keeps the metadata and viewport exports, which a Client Component
 * is not allowed to declare — which is the other half of why this is two files.
 */
export function Studio() {
  return <NextStudio config={config} />;
}
