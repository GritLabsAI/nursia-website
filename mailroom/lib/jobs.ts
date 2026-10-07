import { Client } from "@upstash/qstash";

/**
 * Background work that outlives a request: sending a campaign in chunks, and
 * the every-5-minutes tick.
 *
 * On Vercel, work is handed to QStash, which calls our endpoint back with a
 * signed request and retries if it fails. Locally there's no public URL for
 * QStash to call, so the same work just runs in-process.
 */

export function baseUrl() {
  const explicit = process.env.MAILROOM_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "http://localhost:3000";
}

export const hosted = () => !!process.env.VERCEL && !!process.env.QSTASH_TOKEN;

let client: Client | undefined;
export function qstash() {
  return (client ??= new Client({ token: process.env.QSTASH_TOKEN!, baseUrl: process.env.QSTASH_URL }));
}

/** Calls `path` with `body` in the background. Locally, `inline` runs instead. */
export async function enqueue(path: string, body: unknown, inline: () => Promise<unknown>) {
  if (hosted()) {
    await qstash().publishJSON({ url: `${baseUrl()}${path}`, body, retries: 3 });
    return;
  }
  void inline().catch((e) => console.error(`job ${path}:`, e));
}
