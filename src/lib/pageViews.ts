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
