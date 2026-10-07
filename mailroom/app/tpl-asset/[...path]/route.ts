import { findTemplate, templateAsset } from "@/lib/templates";

/** Images inside template previews: /tpl-asset/<template id>/<path the HTML uses>. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const [tid, ...rest] = (await params).path;
  const t = await findTemplate(tid);
  if (!t) return new Response("Not found", { status: 404 });
  const a = templateAsset(t, rest.map(decodeURIComponent).join("/"));
  if (!a) return new Response("Not found", { status: 404 });
  /* Uploaded templates can be replaced under the same id, so their images mustn't be cached for long. */
  return new Response(Buffer.from(a.base64, "base64"), { headers: { "content-type": a.mime, "cache-control": t.custom ? "private, max-age=60" : "public, max-age=86400" } });
}
