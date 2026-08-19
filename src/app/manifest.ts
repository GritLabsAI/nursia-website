import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — NCLEX practice questions`,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAF6",
    theme_color: "#14161A",
    icons: [
      { src: "/logo/nursia-mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo/nursia-mark-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/logo/nursia-mark-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
