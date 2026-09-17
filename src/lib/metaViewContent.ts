/**
 * Meta ViewContent for the pages that show the offer.
 *
 * Growth tracker ("Meta event flow"): a person "opens a landing page, guide or
 * pricing" → PostHog $pageview on /lp/*, /guides/*, /pricing → the browser sends
 * fbq('track', 'ViewContent', {content_name, content_category}) on page load.
 * Browser only, every view. Meta uses it for audiences (e.g. "ViewContent
 * without Lead"), never as an optimisation goal.
 */

export type ViewContentCategory = "landing_page" | "guide" | "pricing";

export interface ViewContentParams {
  content_name: string;
  content_category: ViewContentCategory;
}

/** The ViewContent for a path, or null for pages that don't show the offer. */
export function viewContentFor(pathname: string): ViewContentParams | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let match = /^\/lp\/([^/]+)$/.exec(path);
  if (match) return { content_name: decodeURIComponent(match[1]), content_category: "landing_page" };
  match = /^\/guides\/([^/]+)$/.exec(path);
  if (match) return { content_name: decodeURIComponent(match[1]), content_category: "guide" };
  if (path === "/pricing") return { content_name: "pricing", content_category: "pricing" };
  return null;
}

/**
 * Whether navigating to `pathname` is a new ViewContent. Unlike PageView (whose
 * first one the Pixel base code sends), the first page load counts too. A
 * repeat of the same path — React Strict Mode's double effect, a re-render — is
 * not a new view; leaving and coming back is.
 */
export function nextViewContent(
  last: string | null,
  pathname: string,
): { params: ViewContentParams | null; last: string } {
  if (last === pathname) return { params: null, last };
  return { params: viewContentFor(pathname), last: pathname };
}
