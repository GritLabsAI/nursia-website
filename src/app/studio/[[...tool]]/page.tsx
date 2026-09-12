import type { Metadata, Viewport } from "next";
import { Studio } from "./Studio";

/**
 * The Studio, at /studio.
 *
 * A catch-all segment because the Studio owns its own routing — /studio,
 * /studio/structure/guide, /studio/vision and everything below them are one
 * client-side application, and Next has to hand all of them to it rather than
 * 404 on the ones it does not recognise. The double bracket makes the segment
 * optional, so /studio itself resolves here too.
 *
 * Outside the (site) group on purpose: the Studio must not render inside the
 * marketing shell. A site header, footer and cookie banner wrapped around a CMS
 * is not merely ugly — the footer runs a Sanity query of its own, and the nav
 * competes for keyboard shortcuts the Studio uses.
 *
 * The Studio itself is in ./Studio.tsx behind a client boundary; see the
 * comment there for why it cannot be imported directly from here.
 */

/* Nothing here is per-request. The shell is static and the Studio fetches its
   own content in the browser, against the user's own Sanity session. */
export const dynamic = "force-static";

/** The Studio is a tool, not a page. Keeping it out of the index is the point. */
export const metadata: Metadata = {
  title: "Nursia Studio",
  robots: { index: false, follow: false },
};

/**
 * The Studio manages its own viewport.
 *
 * Without this it inherits the site's, and the document editor — a desktop
 * application running in a browser — gets a mobile scaling rule applied to it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function StudioPage() {
  return <Studio />;
}
