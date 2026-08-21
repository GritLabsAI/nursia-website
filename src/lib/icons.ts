/**
 * The topic line-icons, ported from the practice mockup.
 *
 * They live here as raw path data rather than as components so `content.ts`
 * can key a topic to one without importing React.
 */
export const ICON_PATHS = {
  clipboard: '<path d="M9 4h6v3H9z"/><path d="M15 5h3v15H6V5h3"/><path d="M9 12h6M9 16h4"/>',
  shield: '<path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.5 12 20 12 20z"/>',
  brain:
    '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V16a3 3 0 0 0 4 2.8"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V16a3 3 0 0 1-4 2.8"/><path d="M12 4v16"/>',
  bed: '<path d="M4 18v-9M4 13h16v5"/><path d="M20 18v-4a3 3 0 0 0-3-3h-6v3"/><circle cx="7.5" cy="10.5" r="1.6"/>',
  pill: '<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9 9l6 6"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M8 15l3-4 3 3 4-6"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  lungs:
    '<path d="M12 4v9"/><path d="M9 9c0 4-1.5 5-3 7s-1 4 1 4 3-1 3-3V9z"/><path d="M15 9c0 4 1.5 5 3 7s1 4-1 4-3-1-3-3V9z"/>',
  droplet: '<path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z"/>',
  stomach: '<path d="M8 4v5c0 5 3 4 6 6s2 6-2 6-7-3-7-8"/><path d="M8 4h4"/>',
  baby: '<circle cx="12" cy="9" r="4"/><path d="M10 8.5h.01M14 8.5h.01"/><path d="M10.5 11a2.5 2.5 0 0 0 3 0"/><path d="M6 20a6 6 0 0 1 12 0"/>',
  smile:
    '<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  kidney:
    '<path d="M9 4c-3 0-5 2.5-5 6s2 10 5 10c2 0 2-2 2-4s0-3 2-4"/><path d="M15 4c3 0 5 2.5 5 6s-2 10-5 10"/>',
  flask:
    '<path d="M10 3v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M9 3h6"/><path d="M7.5 14h9"/>',
  checklist:
    '<path d="M11 6h9M11 12h9M11 18h9"/><path d="M4 6l1.5 1.5L8 5"/><path d="M4 12l1.5 1.5L8 11"/><path d="M4 18l1.5 1.5L8 17"/>',
} as const;

export type IconKey = keyof typeof ICON_PATHS;
