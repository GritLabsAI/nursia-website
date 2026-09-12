/**
 * Generates every cut of the Nursia logo from one source of truth.
 *
 *   node scripts/build-logo.mjs
 *
 * v2 (September 2026): the full stop is gone. The word is "nursia" in Bricolage
 * Grotesque ExtraBold at -0.045em tracking, in one colour, next to a rounded
 * tile carrying the `n`. The colour that used to live in the full stop now
 * lives in that tile, and the tile is dynamic: teal on light grounds,
 * highlighter yellow on dark, plus four context colours.
 *
 * Everything is converted to outlines, so no cut depends on the font being
 * installed. The React logo renders from src/components/logo-paths.ts, which
 * this script writes too — the site and the files ship the same shapes.
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
const kit = join(root, "brand-kit", "logos");
const kitGpt = join(root, "brand-kit", "for-chatgpt");
const components = join(root, "src", "components");

const INK = "#14161A";
const PAPER = "#FBFAF6";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const TEAL = "#0B6B62";
const HIGHLIGHT = "#F5E85C";
const MUTED = "#6E6B63";

const WORD = "nursia";
const TRACKING = -0.045; // em, matches the header

/** The approved tile colours. Each carries the `n` colour it must be paired with. */
const TILES = {
  teal: { hex: TEAL, glyph: PAPER, ground: "light", group: "core" },
  yellow: { hex: HIGHLIGHT, glyph: INK, ground: "any", group: "core" },
  ink: { hex: INK, glyph: PAPER, ground: "light", group: "core" },
  paper: { hex: PAPER, glyph: INK, ground: "dark", group: "core" },
  results: { hex: "#157F52", glyph: PAPER, ground: "light", group: "context" },
  night: { hex: "#1E3A5F", glyph: PAPER, ground: "light", group: "context" },
  plum: { hex: "#5B3A6E", glyph: PAPER, ground: "light", group: "context" },
  bronze: { hex: "#8A5A1F", glyph: PAPER, ground: "light", group: "context" },
};

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
 * Lay the glyphs out by hand so we can apply tracking. Each glyph stays a
 * separate path — merging them into one risks the nonzero fill rule cancelling
 * overlaps at this tracking.
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

const paint = (glyphs, indent = "    ") =>
  glyphs.map((g) => `${indent}<path d="${toD(g.path)}"/>`).join("\n");

/** The word, measured once: every cut is laid out from these numbers. */
const SIZE = 100;
const word = setText(WORD, SIZE);
const wordBox = bbox(word.glyphs.map((g) => g.path));
const WORD_H = wordBox.y2 - wordBox.y1;

/**
 * The tile is a fraction taller than the word, the way a cap-height square sits
 * beside lowercase text. Ratios, not magic numbers, so every cut scales together.
 */
const TILE = WORD_H * 1.145;
const GAP = TILE * 0.273;
const PAD_X = TILE * 0.182;
const PAD_Y = TILE * 0.091;

/** Rounded-rect path — a real path, so the one-colour cuts can knock the n out of it. */
function tilePath(size, radius) {
  const r = size * radius;
  if (!r) return `M0 0H${num(size)}V${num(size)}H0Z`;
  return (
    `M${num(r)} 0H${num(size - r)}A${num(r)} ${num(r)} 0 0 1 ${num(size)} ${num(r)}` +
    `V${num(size - r)}A${num(r)} ${num(r)} 0 0 1 ${num(size - r)} ${num(size)}` +
    `H${num(r)}A${num(r)} ${num(r)} 0 0 1 0 ${num(size - r)}V${num(r)}` +
    `A${num(r)} ${num(r)} 0 0 1 ${num(r)} 0Z`
  );
}

/**
 * The `n` centred on a tile, filling 49% of its width. With no full stop beside
 * it the letter can be this big, which is what keeps it readable at 16px.
 */
function tileGlyph(size) {
  const probe = font.charToGlyph("n").getPath(0, 0, SIZE);
  const b = probe.getBoundingBox();
  const scale = (size * 0.49) / (b.x2 - b.x1);
  const path = font.charToGlyph("n").getPath(0, 0, SIZE * scale);
  const g = path.getBoundingBox();
  const dx = (size - (g.x2 - g.x1)) / 2 - g.x1;
  const dy = (size - (g.y2 - g.y1)) / 2 - g.y1;
  return { d: toD(path), dx, dy };
}

/* ------------------------------------------------------------------- cuts */

const head = (w, h, label = "Nursia") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(w)} ${num(h)}" width="${num(w)}" height="${num(h)}" role="img" aria-label="${label}">\n  <title>${label}</title>`;

/**
 * The square app mark. `knockout` cuts the letter out of the tile instead of
 * painting it, for single-plate print, embroidery and engraving.
 */
function appMark({ size = 512, tile = HIGHLIGHT, glyph = INK, radius = 0.22, knockout = false } = {}) {
  const g = tileGlyph(size);
  const shape = tilePath(size, radius);

  if (knockout) {
    // Translate the glyph into the tile's own coordinates so tile and letter can
    // share one path, and the letter becomes a hole under the even-odd rule.
    const moved = translateD(g.d, g.dx, g.dy);
    return `${head(size, size)}\n  <path fill-rule="evenodd" d="${shape}${moved}" fill="${tile}"/>\n</svg>\n`;
  }

  return `${head(size, size)}
  <path d="${shape}" fill="${tile}"/>
  <g transform="translate(${num(g.dx)} ${num(g.dy)})" fill="${glyph}">
    <path d="${g.d}"/>
  </g>
</svg>
`;
}

/** Shift an absolute M/L/Q/Z path. Every pair of numbers is an (x, y) point. */
function translateD(d, dx, dy) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (m) => {
    const v = parseFloat(m);
    const moved = i % 2 === 0 ? v + dx : v + dy;
    i += 1;
    return num(moved);
  });
}

/** The word on its own, one colour. */
function wordmark({ fill = INK } = {}) {
  const pad = SIZE * 0.14;
  const w = word.advance + pad * 2;
  const h = WORD_H + pad * 2;
  return `${head(w, h)}
  <g transform="translate(${num(pad)} ${num(pad - wordBox.y1)})" fill="${fill}">
${paint(word.glyphs)}
  </g>
</svg>
`;
}

/** The primary lockup: tile, then the word. */
function lockupBody({ tile, glyph, wordFill, knockout, indent = "  " }) {
  const scale = TILE / 512;
  const markSvg = appMark({ tile, glyph, knockout });
  const inner = markSvg
    .split("\n")
    .filter((l) => l.includes("<path") || l.includes("<g ") || l.trim() === "</g>")
    .join("\n");
  const wordX = PAD_X + TILE + GAP - wordBox.x1;
  const wordY = PAD_Y + TILE / 2 + WORD_H / 2 - wordBox.y2;
  return `${indent}<g transform="translate(${num(PAD_X)} ${num(PAD_Y)}) scale(${num(scale)})">
${inner}
${indent}</g>
${indent}<g transform="translate(${num(wordX)} ${num(wordY)})" fill="${wordFill}">
${paint(word.glyphs)}
${indent}</g>`;
}

function lockup({ tile = HIGHLIGHT, glyph = INK, wordFill = INK, knockout = false } = {}) {
  const w = PAD_X * 2 + TILE + GAP + word.advance;
  const h = TILE + PAD_Y * 2;
  return `${head(w, h)}
${lockupBody({ tile, glyph, wordFill, knockout })}
</svg>
`;
}

/** Stacked lockup: the horizontal logo over the descriptor, for square-ish placements. */
function stacked({ tile = HIGHLIGHT, glyph = INK, wordFill = INK, reverse = false } = {}) {
  const lockW = PAD_X * 2 + TILE + GAP + word.advance;
  const lockH = TILE + PAD_Y * 2;
  const sub = reverse ? PAPER : MUTED;
  const subOpacity = reverse ? "0.6" : "1";
  const subSize = SIZE * 0.185;
  const gap = SIZE * 0.2;
  const pad = SIZE * 0.14;
  const w = Math.max(lockW, subSize * 20) + pad * 2;
  const h = lockH + gap + subSize + pad * 2;

  return `${head(w, h, "Nursia — NCLEX practice questions")}
  <g transform="translate(${num((w - lockW) / 2)} ${num(pad)})">
${lockupBody({ tile, glyph, wordFill, knockout: false, indent: "    " })}
  </g>
  <text x="${num(w / 2)}" y="${num(pad + lockH + gap + subSize * 0.78)}"
    font-family="ui-monospace, 'IBM Plex Mono', Menlo, monospace" font-size="${num(subSize)}"
    letter-spacing="${num(subSize * 0.16)}" fill="${sub}" fill-opacity="${subOpacity}"
    text-anchor="middle">NCLEX PRACTICE QUESTIONS</text>
</svg>
`;
}

/** Social / OG card. The tile carries the colour, so there is no highlighter rule. */
function ogCard({ dark = true } = {}) {
  const W = 1200;
  const H = 630;
  const bg = dark ? INK : PAPER;
  const tile = dark ? HIGHLIGHT : TEAL;
  const glyph = dark ? INK : PAPER;
  const wordFill = dark ? PAPER : INK;
  const lockW = PAD_X * 2 + TILE + GAP + word.advance;
  const scale = 720 / lockW;
  const grid = [
    ...Array.from(
      { length: Math.ceil(W / 40) },
      (_, i) => `<rect x="${i * 40}" y="0" width="1" height="${H}"/>`,
    ),
    ...Array.from(
      { length: Math.ceil(H / 40) },
      (_, i) => `<rect x="0" y="${i * 40}" width="${W}" height="1"/>`,
    ),
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <g fill="${dark ? "#FFFFFF" : INK}" opacity="${dark ? "0.055" : "0.04"}">${grid}</g>
  <g transform="translate(${num(92 - PAD_X * scale)} 196) scale(${num(scale)})">
${lockupBody({ tile, glyph, wordFill, knockout: false, indent: "    " })}
  </g>
  <text x="92" y="446" font-family="ui-monospace, 'IBM Plex Mono', Menlo, monospace"
    font-size="25" letter-spacing="3.2" fill="${wordFill}" fill-opacity="${dark ? "0.62" : "0.7"}">NCLEX-RN PRACTICE QUESTIONS, WRITTEN BY NURSES</text>
</svg>
`;
}

/** The web logo, coloured at runtime through CSS variables. */
function dynamicLockup() {
  const gb = tileGlyph(512);
  const svg = lockup({ tile: HIGHLIGHT, glyph: INK, wordFill: INK });
  return svg
    .replace(
      "<title>Nursia</title>",
      `<title>Nursia</title>
  <!--
    Dynamic colour: inline this SVG and set these CSS variables on it or a parent.
      nursia-tile    tile colour   (default ${HIGHLIGHT} highlighter)
      nursia-glyph   the n         (default ${INK} ink)
      nursia-word    wordmark      (default ${INK} ink)
    Each name is prefixed with two hyphens in CSS. Used as a plain img, the
    defaults apply. Approved tile and n pairs are in the brand kit.
  -->
  <style>
    .nursia-tile  { fill: var(--nursia-tile, ${HIGHLIGHT}); }
    .nursia-glyph { fill: var(--nursia-glyph, ${INK}); }
    .nursia-word  { fill: var(--nursia-word, ${INK}); }
  </style>`,
    )
    .replace(`<path d="${tilePath(512, 0.22)}" fill="${HIGHLIGHT}"`, `<path class="nursia-tile" d="${tilePath(512, 0.22)}" fill="${HIGHLIGHT}"`)
    .replace(`<g transform="translate(${num(gb.dx)} ${num(gb.dy)})" fill="${INK}">`, `<g class="nursia-glyph" transform="translate(${num(gb.dx)} ${num(gb.dy)})" fill="${INK}">`)
    .replace(`fill="${INK}">`, `class="nursia-word" fill="${INK}">`);
}

/* ------------------------------------------------------------------ write */

const svgs = {
  // primary lockup — tile plus word
  "nursia-logo.svg": lockup(),
  "nursia-logo-dynamic.svg": dynamicLockup(),
  "nursia-logo-teal.svg": lockup({ tile: TEAL, glyph: PAPER }),
  "nursia-logo-ink.svg": lockup({ tile: INK, glyph: PAPER }),
  "nursia-logo-reverse.svg": lockup({ tile: HIGHLIGHT, glyph: INK, wordFill: PAPER }),
  "nursia-logo-paper-on-dark.svg": lockup({ tile: PAPER, glyph: INK, wordFill: PAPER }),
  "nursia-logo-photo.svg": lockup({ tile: HIGHLIGHT, glyph: INK, wordFill: WHITE }),
  "nursia-logo-black.svg": lockup({ tile: BLACK, wordFill: BLACK, knockout: true }),
  "nursia-logo-white.svg": lockup({ tile: WHITE, wordFill: WHITE, knockout: true }),
  // context tiles
  ...Object.fromEntries(
    Object.entries(TILES)
      .filter(([, t]) => t.group === "context")
      .map(([id, t]) => [`nursia-logo-${id}.svg`, lockup({ tile: t.hex, glyph: t.glyph })]),
  ),
  // word alone, always one colour
  "nursia-wordmark.svg": wordmark({ fill: INK }),
  "nursia-wordmark-reverse.svg": wordmark({ fill: PAPER }),
  "nursia-wordmark-black.svg": wordmark({ fill: BLACK }),
  "nursia-wordmark-white.svg": wordmark({ fill: WHITE }),
  "nursia-wordmark-teal.svg": wordmark({ fill: TEAL }),
  // stacked lockup with the descriptor
  "nursia-stacked.svg": stacked({}),
  "nursia-stacked-reverse.svg": stacked({
    tile: HIGHLIGHT,
    glyph: INK,
    wordFill: PAPER,
    reverse: true,
  }),
  // square app mark, one per approved tile
  ...Object.fromEntries(
    Object.entries(TILES).map(([id, t]) => [
      id === "yellow" ? "nursia-mark.svg" : `nursia-mark-${id}.svg`,
      appMark({ tile: t.hex, glyph: t.glyph }),
    ]),
  ),
  "nursia-mark-square.svg": appMark({ radius: 0 }),
  "nursia-mark-black.svg": appMark({ tile: BLACK, knockout: true }),
  "nursia-mark-white.svg": appMark({ tile: WHITE, knockout: true }),
  // social
  "nursia-og.svg": ogCard({ dark: true }),
  "nursia-og-light.svg": ogCard({ dark: false }),
};

/* Nothing ships with a broken coordinate or a dropped glyph. */
for (const [name, svg] of Object.entries(svgs)) {
  if (/NaN|Infinity|undefined/.test(svg)) {
    throw new Error(`${name} contains a non-finite value`);
  }
  const paths = (svg.match(/<path /g) || []).length;
  const isMark = name.includes("nursia-mark");
  const isKnockout = name.includes("black") || name.includes("white");
  const expected = isMark
    ? isKnockout
      ? 1
      : 2
    : name.includes("wordmark")
      ? WORD.length
      : isKnockout
        ? WORD.length + 1 // knocked-out tile is one path
        : WORD.length + 2; // tile + n + word
  if (paths !== expected) {
    throw new Error(`${name} has ${paths} paths, expected ${expected}`);
  }
}

mkdirSync(out, { recursive: true });
mkdirSync(kit, { recursive: true });

for (const [name, svg] of Object.entries(svgs)) {
  writeFileSync(join(out, name), svg);
  writeFileSync(join(kit, name), svg);
}
console.log(`svg   ${Object.keys(svgs).length} cuts → public/logo/ and brand-kit/logos/`);

/* Rasters. Favicons and store icons must be bitmaps, and social crawlers do
   not render SVG. */
async function raster(svg, width, { flatten } = {}) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const density = Math.max(1, (72 * width) / parseFloat(vb[1]));
  let img = sharp(Buffer.from(svg), { density }).resize({ width });
  if (flatten) img = img.flatten({ background: flatten });
  return img.png({ compressionLevel: 9 }).toBuffer();
}

const rasters = [
  ["nursia-mark-192.png", svgs["nursia-mark.svg"], 192],
  ["nursia-mark-512.png", svgs["nursia-mark.svg"], 512],
  ["nursia-mark-1024.png", svgs["nursia-mark.svg"], 1024],
  ["nursia-mark-square-1024.png", svgs["nursia-mark-square.svg"], 1024],
  ["nursia-mark-teal-512.png", svgs["nursia-mark-teal.svg"], 512],
  ["nursia-mark-paper-512.png", svgs["nursia-mark-paper.svg"], 512],
  ["nursia-logo-1024.png", svgs["nursia-logo.svg"], 1024],
  ["nursia-logo-2048.png", svgs["nursia-logo.svg"], 2048],
  ["nursia-logo-reverse-1024.png", svgs["nursia-logo-reverse.svg"], 1024],
  ["nursia-wordmark-1024.png", svgs["nursia-wordmark.svg"], 1024],
  ["nursia-wordmark-reverse-1024.png", svgs["nursia-wordmark-reverse.svg"], 1024],
  ["nursia-stacked-1024.png", svgs["nursia-stacked.svg"], 1024],
  ["nursia-og.png", svgs["nursia-og.svg"], 1200],
  ["favicon-32.png", svgs["nursia-mark.svg"], 32],
];

for (const [name, svg, width] of rasters) {
  const buf = await raster(svg, width);
  writeFileSync(join(out, name), buf);
  writeFileSync(join(kit, name), buf);
}
console.log(`png   ${rasters.length} rasters → public/logo/ and brand-kit/logos/`);

/* App-router icon conventions — Next serves these from the routes themselves. */
mkdirSync(app, { recursive: true });
writeFileSync(join(app, "icon.svg"), svgs["nursia-mark-square.svg"]);
writeFileSync(join(app, "apple-icon.png"), await raster(svgs["nursia-mark-square.svg"], 180));
writeFileSync(join(app, "opengraph-image.png"), await raster(svgs["nursia-og.svg"], 1200));

/* favicon.ico — 16/32/48 in one file, PNG-compressed entries. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.buf)]);
}

const icoEntries = [];
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, buf: await raster(svgs["nursia-mark.svg"], size) });
}
writeFileSync(join(app, "favicon.ico"), ico(icoEntries));
console.log("icon  src/app/icon.svg, apple-icon.png, opengraph-image.png, favicon.ico");

/* Three PNGs and a prompt live in the kit for image models, which cannot read SVG. */
mkdirSync(kitGpt, { recursive: true });
writeFileSync(join(kitGpt, "logo-mark.png"), await raster(svgs["nursia-mark.svg"], 512));
writeFileSync(join(kitGpt, "logo-wordmark.png"), await raster(svgs["nursia-logo.svg"], 1024));
writeFileSync(
  join(kitGpt, "logo-wordmark-on-dark.png"),
  await raster(svgs["nursia-logo-reverse.svg"], 1024, { flatten: INK }),
);
console.log("png   3 references → brand-kit/for-chatgpt/");

/* The shapes the React logo renders, so the site and the files never drift. */
const glyphInTile = (() => {
  const g = tileGlyph(512);
  return translateD(g.d, g.dx, g.dy);
})();

writeFileSync(
  join(components, "logo-paths.ts"),
  `/**
 * Generated by scripts/build-logo.mjs — do not edit by hand.
 *
 * The Nursia logo as outlines: the wordmark's six letters, and the \`n\` centred
 * on a 512 tile. <Logo> draws from these, so the header and the files in
 * public/logo are the same shapes.
 */

export const WORDMARK_PATHS = [
${word.glyphs.map((g) => `  "${toD(g.path)}",`).join("\n")}
] as const;

/** Wordmark box, with the baseline at y = ${num(-wordBox.y1)} once translated. */
export const WORDMARK = {
  advance: ${num(word.advance)},
  height: ${num(WORD_H)},
  x1: ${num(wordBox.x1)},
  y1: ${num(wordBox.y1)},
  y2: ${num(wordBox.y2)},
} as const;

/** Tile geometry, in the lockup's own units. */
export const LOCKUP = {
  tile: ${num(TILE)},
  gap: ${num(GAP)},
  padX: ${num(PAD_X)},
  padY: ${num(PAD_Y)},
  width: ${num(PAD_X * 2 + TILE + GAP + word.advance)},
  height: ${num(TILE + PAD_Y * 2)},
  radius: 0.22,
} as const;

/** A 512 tile and the n centred on it. */
export const TILE_PATH = "${tilePath(512, 0.22)}";
export const TILE_GLYPH_PATH = "${glyphInTile}";

/** The approved tile colours, and the n colour each one must be paired with. */
export const TILES = ${JSON.stringify(TILES, null, 2).replace(/"([a-z]+)":/g, "$1:")} as const;

export type TileName = keyof typeof TILES;
`,
);
console.log("ts    src/components/logo-paths.ts");
