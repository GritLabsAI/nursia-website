import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * PostHog, served from our own origin.
   *
   * The point of the proxy is not tidiness. `us.i.posthog.com` is on every
   * blocklist worth the name, and the blocking is not evenly distributed: paid,
   * mobile and privacy-conscious traffic is blocked at a far higher rate than
   * organic desktop traffic. That is a problem for a dashboard whose whole job
   * is comparing paid against organic — the gap between the two would be partly
   * real and partly an artefact of who runs a blocker, with no way to tell the
   * halves apart. Same-origin requests are not blocked, so the comparison holds.
   *
   * The asset-host split matters, and is bigger than the SDK bundle and replay
   * recorder: with a same-origin `api_host` posthog-js can't infer a US/EU
   * region from the URL, so it falls back to routing every "assets"-type
   * request (`requestRouter.endpointFor("assets", …)` in posthog-js) through
   * `api_host` unchanged. That includes `/array/<token>/config[.js]` — the
   * remote-config fetch that gates anything server-controlled, Core Web
   * Vitals autocapture among them (`capture_performance: { web_vitals: true }`
   * in PostHogProvider.tsx only sets local defaults; the SDK only starts
   * capturing once remote config echoes `capturePerformance.web_vitals` back).
   * Only `/ingest/static/*` was ever forwarded to the assets host, so
   * `/ingest/array/*` fell through to the catch-all below and hit the
   * ingestion host instead — remote config silently never loaded, and with it
   * every event gated behind it, while locally-configured capture (pageview,
   * autocapture) kept working. Route it wherever the static bundle goes.
   */
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  /* PostHog's API is strict about the trailing slash and Next would otherwise
     redirect /ingest/decide/ to /ingest/decide, losing the POST body with it. */
  skipTrailingSlashRedirect: true,

  experimental: {
    /*
     * Retry a page that fails to prerender, rather than ending the build.
     *
     * Defaults to undefined, which is one attempt: the first page whose data
     * fetch fails takes the whole export down with it. With 1,700 pages read
     * from a rate-limited API that is a single unlucky request away from a red
     * deploy, which is exactly how 2026-09-12 failed — three pages 429'd and
     * "exiting the build" followed immediately.
     *
     * This is the backstop, not the fix; the fix is the token in
     * src/sanity/client.ts. Kept because the two protect against different
     * things: the token lowers the odds of being throttled, this stops one
     * page that still is from costing a deploy.
     *
     * If a build is still throttled, the next lever is volume rather than
     * retries — `staticGenerationMaxConcurrency` (pages exported per worker)
     * and `cpus` (worker count) both cut requests per second, at the cost of a
     * longer build.
     */
    staticGenerationRetryCount: 3,
  },
};

export default nextConfig;
