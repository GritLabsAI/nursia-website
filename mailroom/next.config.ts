import type { NextConfig } from "next";

/**
 * Mailroom: the email console for Nursia and PrepClever.
 *
 * Templates, images and the Nursia question bank are compiled into
 * lib/content.generated.ts by `npm run content`, so nothing here reads files
 * at runtime and there's no file tracing to get wrong on Vercel.
 *
 * The dashboard itself is the static app in public/ (index.html, app.js,
 * app.css); "/" serves it, and proxy.ts keeps it behind sign-in.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};

export default nextConfig;
