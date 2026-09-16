/**
 * Whether a navigation to `pathname` needs its own Meta PageView.
 *
 * The Pixel base code fires the first PageView itself, so the first call only
 * records the path; later calls fire only when the path actually changed. Fed
 * from a module-level "last path" in MetaPixel, this is what keeps React Strict
 * Mode's double effect, remounts and re-renders from counting a page twice.
 */
export function nextPageView(last: string | null, pathname: string): { fire: boolean; last: string } {
  if (last === null) return { fire: false, last: pathname };
  return { fire: last !== pathname, last: pathname };
}

/**
 * The Meta `ViewContent` payload for a path, or null where the event does not
 * belong.
 *
 * ViewContent is Meta's "saw the offer" event, so it is limited to the pages
 * that carry one: the landing pages, the guides, and pricing. Firing it
 * everywhere would bury that signal in navigation noise, and PageView already
 * covers "a page was opened".
 *
 * Pixel only: no server copy, so no event_id and nothing to deduplicate.
 */
export function viewContentFor(pathname: string): { content_name: string; content_category: string } | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/pricing") return { content_name: "pricing", content_category: "pricing" };
  for (const [prefix, category] of [
    ["/lp/", "landing_page"],
    ["/guides/", "guide"],
  ] as const) {
    if (!path.startsWith(prefix)) continue;
    const slug = path.slice(prefix.length);
    // A section index (/guides) carries no offer; only a real slug does.
    if (!slug || slug.includes("/")) return null;
    return { content_name: slug, content_category: category };
  }
  return null;
}
