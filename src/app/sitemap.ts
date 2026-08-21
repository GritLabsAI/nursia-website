import type { MetadataRoute } from "next";
import { GUIDES, SITE, TOPICS } from "@/lib/content";

/** Every public page. The gated ones (/signup, /login, /try) stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const at = (path: string, priority: number) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date("2026-08-01"),
    priority,
  });

  return [
    at("/", 1),
    at("/nclex-practice-questions", 0.9),
    at("/practice", 0.9),
    ...TOPICS.map((t) => at(`/nclex-practice-questions/${t.slug}`, 0.8)),
    at("/guides", 0.7),
    ...GUIDES.map((g) => at(`/guides/${g.slug}`, 0.6)),
    at("/nclex", 0.6),
    at("/pricing", 0.7),
    at("/about", 0.5),
    at("/contact", 0.4),
    at("/refunds", 0.3),
    at("/terms", 0.2),
    at("/privacy", 0.2),
  ];
}
