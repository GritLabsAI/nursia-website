import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

/* /lp/* are the paid-ad landing pages: they duplicate the SEO pages on purpose
   and must never be indexed against them. /try, /signup and /login are gated
   funnel steps with nothing to rank. */
const PRIVATE = ["/try", "/signup", "/login", "/lp/"];

/* Answer engines and their training crawlers. We allow them deliberately
   rather than by default: the whole point of writing 25 RN-reviewed guides is
   to be the thing that gets cited when someone asks an assistant about the
   NCLEX. Blocking these would trade that away for nothing. */
const ANSWER_ENGINES = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      /* The Google Ads crawler must reach the landing pages it is sending
         traffic to, or the ads are disapproved. It ignores the wildcard group,
         so it needs its own. */
      { userAgent: "AdsBot-Google", allow: "/" },
      { userAgent: ANSWER_ENGINES, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
