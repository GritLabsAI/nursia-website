import { ICON_PATHS, type IconKey } from "@/lib/icons";

/**
 * A topic's line icon. Stroke follows `currentColor` so the tile decides the
 * colour — there is no per-topic hue on this site.
 */
export function TopicIcon({ name, className }: { name: IconKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}
