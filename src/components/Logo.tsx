import { LOCKUP, TILE_GLYPH_PATH, TILE_PATH, TILES, WORDMARK, WORDMARK_PATHS } from "./logo-paths";
import type { TileName } from "./logo-paths";

/**
 * The logo, drawn from the same outlines as the files in public/logo — the word
 * is never re-set as live text, so the header cannot drift from the artwork.
 *
 * v2 has no full stop. The colour lives in the tile behind the `n`, and the
 * primary tile is highlighter yellow with an ink `n` — it carries every ground,
 * light and dark alike. Teal, ink, paper and the four context tiles remain for
 * surfaces that need a quieter mark. Every fill reads a CSS variable first, so a
 * section can retheme the mark with `--nursia-tile` without touching this
 * component.
 */
type Props = {
  /** Word colour. The word is always one colour, and never matches the tile. */
  tone?: "ink" | "paper" | "white";
  /** Tile colour. Each tile carries the `n` colour it must be paired with. */
  tile?: TileName;
  variant?: "lockup" | "wordmark" | "mark";
  /** Give it a label when it is not already inside a labelled link. */
  label?: string;
  className?: string;
};

const WORD_FILL = { ink: "#14161A", paper: "#FBFAF6", white: "#FFFFFF" } as const;

export function Logo({
  tone = "ink",
  tile = "yellow",
  variant = "lockup",
  label,
  className,
}: Props) {
  const { hex, glyph } = TILES[tile];
  const word = `var(--nursia-word, ${WORD_FILL[tone]})`;
  const tileFill = `var(--nursia-tile, ${hex})`;
  const glyphFill = `var(--nursia-glyph, ${glyph})`;
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true };

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 512 512" className={className ?? "h-8 w-8"} {...a11y}>
        <path d={TILE_PATH} fill={tileFill} />
        <path d={TILE_GLYPH_PATH} fill={glyphFill} />
      </svg>
    );
  }

  const words = (
    <g fill={word}>
      {WORDMARK_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </g>
  );

  if (variant === "wordmark") {
    const pad = 14;
    return (
      <svg
        viewBox={`0 0 ${WORDMARK.advance + pad * 2} ${WORDMARK.height + pad * 2}`}
        className={className ?? "h-6 w-auto"}
        {...a11y}
      >
        <g transform={`translate(${pad} ${pad - WORDMARK.y1})`}>{words}</g>
      </svg>
    );
  }

  const scale = LOCKUP.tile / 512;
  const wordX = LOCKUP.padX + LOCKUP.tile + LOCKUP.gap - WORDMARK.x1;
  const wordY = LOCKUP.padY + LOCKUP.tile / 2 + WORDMARK.height / 2 - WORDMARK.y2;

  return (
    <svg
      viewBox={`0 0 ${LOCKUP.width} ${LOCKUP.height}`}
      className={className ?? "h-7 w-auto"}
      {...a11y}
    >
      <g transform={`translate(${LOCKUP.padX} ${LOCKUP.padY}) scale(${scale})`}>
        <path d={TILE_PATH} fill={tileFill} />
        <path d={TILE_GLYPH_PATH} fill={glyphFill} />
      </g>
      <g transform={`translate(${wordX} ${wordY})`}>{words}</g>
    </svg>
  );
}
