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
   * The static split matters: the SDK bundle and session-replay recorder come
   * from the assets host, everything else from the ingestion host. Pointing both
   * at one destination silently breaks one of them.
   */
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
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
};

export default nextConfig;
