/**
 * Generates every cut of the Nursia wordmark from one source of truth.
 *
 *   node scripts/build-logo.mjs
 *
 * The wordmark is "nursia" in Bricolage Grotesque ExtraBold at -0.045em
 * tracking, with the full stop in scrub teal — the same setting the site header
 * renders live. Here it is converted to outlines so every cut is a real vector
 * that does not depend on the font being installed anywhere.
 *
 * Requires scripts/.fonts/bricolage-800.ttf (see scripts/README.md).
 *
 * Note: we serialize path data by hand rather than using opentype's
 * toPathData(), which emits NaN for some coordinate values and silently drops
 * whole glyphs. Every output is checked for non-finite numbers before it is
 * written.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "logo");
const app = join(root, "src", "app");

const INK = "#14161A";
const PAPER = "#FBFAF6";
const TEAL = "#0B6B62";
const HIGHLIGHT = "#F5E85C";
const MUTED = "#6E6B63";

const WORD = "nursia";
const DOT = ".";
const TRACKING = -0.045; // em, matches the header

const font = opentype.parse(
  readFileSync(join(root, "scripts", ".fonts", "bricolage-800.ttf")).buffer,
);

/* ------------------------------------------------------------ serialization */

function num(n) {
  if (!Number.isFinite(n)) throw new Error(`non-finite coordinate: ${n}`);
  const s = n.toFixed(3);
  const trimmed = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return trimmed === "-0" ? "0" : trimmed;
}

/** Serialize opentype path commands to an SVG `d` string. */
function toD(path) {
  return path.commands
    .map((c) => {
      switch (c.type) {
        case "M":
          return `M${num(c.x)} ${num(c.y)}`;
        case "L":
          return `L${num(c.x)} ${num(c.y)}`;
        case "C":
          return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
        case "Q":
          return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
        case "Z":
          return "Z";
        default:
          throw new Error(`unknown command ${c.type}`);
      }
    })
    .join("");
}

function bbox(paths) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const p of paths) {
    const b = p.getBoundingBox();
    x1 = Math.min(x1, b.x1);
    y1 = Math.min(y1, b.y1);
    x2 = Math.max(x2, b.x2);
    y2 = Math.max(y2, b.y2);
  }
  return { x1, y1, x2, y2 };
}

/* ---------------------------------------------------------------- geometry */

/**
 * Lay the glyphs out by hand so we can apply tracking and keep the full stop
 * as its own shape. Each glyph stays a separate path — merging them into one
 * risks the nonzero fill rule cancelling overlaps at this tracking.
 */
function setText(text, size) {
  const scale = size / font.unitsPerEm;
  const track = TRACKING * size;
  let x = 0;
  const glyphs = [];

  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    glyphs.push({ ch, path: glyph.getPath(x, 0, size) });
    x += glyph.advanceWidth * scale + track;
  }

  return { glyphs, advance: x - track };
}

const paint = (glyphs, textFill, dotFill) =>
  glyphs
    .map((g) => `    <path d="${toD(g.path)}" fill="${g.ch === DOT ? dotFill : textFill}"/>`)
    .join("\n");

/* ------------------------------------------------------------------- cuts */

const TONES = {
  ink: { text: INK, dot: TEAL },
  paper: { text: PAPER, dot: HIGHLIGHT },
  black: { text: "#000000", dot: "#000000" },
  white: { text: "#FFFFFF", dot: "#FFFFFF" },
  teal: { text: TEAL, dot: TEAL },
};

/**
 * Horizontal wordmark — the primary cut.
 * `duo: false` renders one colour throughout, for single-plate print,
 * embroidery, engraving, and anywhere the teal full stop would not survive.
 */
function wordmark({ size = 100, tone = "ink", duo = true, pad = 0.14 } = {}) {
  const { glyphs, advance } = setText(WORD + DOT, size);
  const box = bbox(glyphs.map((g) => g.path));
  const colors = TONES[tone];
  const dotFill = duo ? colors.dot : colors.text;

  // Crop to the real ink, not to font metrics, so nothing is ever clipped.
  const padding = size * pad;
  const w = advance + padding * 2;
  const h = box.y2 - box.y1 + padding * 2;
  const ox = padding;
  const oy = padding - box.y1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(w)} ${num(h)}" width="${num(w)}" height="${num(h)}" role="img" aria-label="Nursia">
  <title>Nursia</title>
  <g transform="translate(${num(ox)} ${num(oy)})">
${paint(glyphs, colors.text, dotFill)}
  </g>
</svg>
`;
}

/**
 * The app mark: "n" plus the full stop on a square. At favicon sizes the whole
 * word is illegible, so the mark keeps the letter it starts with and the one
 * piece of colour anybody remembers.
 */
function appMark({ size = 512, bg = INK, fg = PAPER, dot = HIGHLIGHT, radius = 0.22 } = {}) {
  const unit = size * 0.56;
  const { glyphs, advance } = setText("n" + DOT, unit);
  const box = bbox(glyphs.map((g) => g.path));

  const ox = (size - advance) / 2;
  const oy = (size + (box.y2 - box.y1)) / 2 - box.y2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Nursia">
  <title>Nursia</title>
  <rect width="${size}" height="${size}" rx="${num(size * radius)}" fill="${bg}"/>
  <g transform="translate(${num(ox)} ${num(oy)})">
${paint(glyphs, fg, dot)}
  </g>
</svg>
`;
}

/** Stacked lockup: wordmark over the descriptor, for square-ish placements. */
function stacked({ size = 100, tone = "ink" } = {}) {
  const { glyphs, advance } = setText(WORD + DOT, size);
  const box = bbox(glyphs.map((g) => g.path));
  const colors = TONES[tone];
  const sub = tone === "paper" ? "#FBFAF6" : MUTED;
  const subOpacity = tone === "paper" ? "0.6" : "1";

  const pad = size * 0.14;
  const inkHeight = box.y2 - box.y1;
  const subSize = size * 0.185;
  const gap = size * 0.28;
  const w = Math.max(advance, subSize * 20) + pad * 2;
  const h = inkHeight + gap + subSize + pad * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(w)} ${num(h)}" width="${num(w)}" height="${num(h)}" role="img" aria-label="Nursia — NCLEX practice questions">
  <title>Nursia — NCLEX practice questions</title>
  <g transform="translate(${num((w - advance) / 2)} ${num(pad - box.y1)})">
${paint(glyphs, colors.text, colors.dot)}
  </g>
  <text x="${num(w / 2)}" y="${num(pad + inkHeight + gap + subSize * 0.78)}"
    font-family="ui-monospace, 'IBM Plex Mono', Menlo, monospace" font-size="${num(subSize)}"
    letter-spacing="${num(subSize * 0.16)}" fill="${sub}" fill-opacity="${subOpacity}"
    text-anchor="middle">NCLEX PRACTICE QUESTIONS</text>
</svg>
`;
}

/** Social / OG card: wordmark on the ink ground, under a highlighter rule. */
function ogCard() {
  const W = 1200;
  const H = 630;
  const size = 150;
  const { glyphs, advance } = setText(WORD + DOT, size);
  const box = bbox(glyphs.map((g) => g.path));
  const x = 92;
  const baseline = 330;

  const grid = [
    ...Array.from(
      { length: Math.ceil(W / 40) },
      (_, i) => `<rect x="${i * 40}" y="0" width="1" height="${H}" fill="#fff"/>`,
    ),
    ...Array.from(
      { length: Math.ceil(H / 40) },
      (_, i) => `<rect x="0" y="${i * 40}" width="${W}" height="1" fill="#fff"/>`,
    ),
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g opacity="0.055">${grid}</g>
  <rect x="${x}" y="${num(baseline + box.y1 - 34)}" width="${num(advance)}" height="13" fill="${HIGHLIGHT}"/>
  <g transform="translate(${x} ${baseline})">
${paint(glyphs, PAPER, HIGHLIGHT)}
  </g>
  <text x="${x}" y="${baseline + 74}" font-family="ui-monospace, 'IBM Plex Mono', Menlo, monospace"
    font-size="25" letter-spacing="3.2" fill="#FBFAF6" fill-opacity="0.6">NCLEX-RN PRACTICE QUESTIONS, WRITTEN BY NURSES</text>
  <text x="${x}" y="${H - 66}" font-family="ui-monospace, 'IBM Plex Mono', Menlo, monospace"
    font-size="23" letter-spacing="2" fill="#FBFAF6" fill-opacity="0.38">1,200 questions · 50 free · no card</text>
</svg>
`;
}

/* ------------------------------------------------------------------ write */

mkdirSync(out, { recursive: true });

const svgs = {
  // primary — full colour, on light and on dark
  "nursia-wordmark.svg": wordmark({ tone: "ink" }),
  "nursia-wordmark-reverse.svg": wordmark({ tone: "paper" }),
  // single colour — one-plate print, embroidery, engraving, hostile grounds
  "nursia-wordmark-black.svg": wordmark({ tone: "black", duo: false }),
  "nursia-wordmark-white.svg": wordmark({ tone: "white", duo: false }),
  "nursia-wordmark-teal.svg": wordmark({ tone: "teal", duo: false }),
  // stacked lockup with the descriptor
  "nursia-stacked.svg": stacked({ tone: "ink" }),
  "nursia-stacked-reverse.svg": stacked({ tone: "paper" }),
  // square app mark
  "nursia-mark.svg": appMark({}),
  "nursia-mark-light.svg": appMark({ bg: PAPER, fg: INK, dot: TEAL }),
  "nursia-mark-square.svg": appMark({ radius: 0 }),
  // social
  "nursia-og.svg": ogCard(),
};

/* Nothing ships with a broken coordinate or a dropped glyph. */
const EXPECTED_PATHS = {
  wordmark: WORD.length + 1,
  stacked: WORD.length + 1,
  mark: 2,
};

for (const [name, svg] of Object.entries(svgs)) {
  if (/NaN|Infinity|undefined/.test(svg)) {
    throw new Error(`${name} contains a non-finite value`);
  }
  const paths = (svg.match(/<path /g) || []).length;
  const expected = name.includes("wordmark")
    ? EXPECTED_PATHS.wordmark
    : name.includes("stacked") || name.includes("og")
      ? EXPECTED_PATHS.stacked
      : EXPECTED_PATHS.mark;
  if (paths !== expected) {
    throw new Error(`${name} has ${paths} glyph paths, expected ${expected}`);
  }
  writeFileSync(join(out, name), svg);
  console.log("svg  ", `public/logo/${name}`, `(${paths} glyphs)`);
}

/* Rasters. Favicons and store icons must be bitmaps, and social crawlers do
   not render SVG. */
const rasters = [
  ["nursia-mark-1024.png", svgs["nursia-mark.svg"], 1024],
  ["nursia-mark-512.png", svgs["nursia-mark.svg"], 512],
  ["nursia-mark-192.png", svgs["nursia-mark.svg"], 192],
  ["nursia-mark-light-512.png", svgs["nursia-mark-light.svg"], 512],
  ["nursia-wordmark-1024.png", svgs["nursia-wordmark.svg"], 1024],
  ["nursia-wordmark-reverse-1024.png", svgs["nursia-wordmark-reverse.svg"], 1024],
  ["nursia-stacked-1024.png", svgs["nursia-stacked.svg"], 1024],
  ["nursia-og.png", svgs["nursia-og.svg"], 1200],
];

for (const [name, svg, width] of rasters) {
  await sharp(Buffer.from(svg)).resize({ width }).png().toFile(join(out, name));
  console.log("png  ", `public/logo/${name}`);
}

/* App-router icon conventions — Next serves these from the routes themselves. */
mkdirSync(app, { recursive: true });
writeFileSync(join(app, "icon.svg"), svgs["nursia-mark-square.svg"]);
console.log("icon ", "src/app/icon.svg");

await sharp(Buffer.from(appMark({ size: 180, radius: 0 })))
  .resize({ width: 180 })
  .png()
  .toFile(join(app, "apple-icon.png"));
console.log("icon ", "src/app/apple-icon.png");

await sharp(Buffer.from(svgs["nursia-og.svg"]))
  .resize({ width: 1200 })
  .png()
  .toFile(join(app, "opengraph-image.png"));
console.log("icon ", "src/app/opengraph-image.png");

/* 32px favicon — the one raster size that still matters */
await sharp(Buffer.from(appMark({ size: 128, radius: 0.22 })))
  .resize({ width: 32 })
  .png()
  .toFile(join(out, "favicon-32.png"));
console.log("png  ", "public/logo/favicon-32.png");
