"use client";

import { useEffect } from "react";
import { lpViewed } from "@/lib/analytics";

/**
 * Area A's landing-page event. `$pageview` already carries the URL, but the
 * slug is what separates creative clusters (dashboard tile 4), and a named
 * event keeps that comparison readable when a campaign's URL changes.
 */
export function LpViewed({ src }: { src: string }) {
  useEffect(() => {
    lpViewed(src);
  }, [src]);
  return null;
}
