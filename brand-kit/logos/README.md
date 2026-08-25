# Nursia logo

The mark is the word set in **Bricolage Grotesque ExtraBold at −0.045em tracking**,
with the full stop in scrub teal. Everything in this folder is generated from one
script — `node scripts/build-logo.mjs` — with the letterforms converted to outlines,
so nothing here depends on the font being installed.

Do not re-set the wordmark by typing it in Bricolage. Use these files.

## The cuts

### Horizontal wordmark — the default
| File | Use |
| --- | --- |
| `nursia-wordmark.svg` | Primary. Ink on any light ground. |
| `nursia-wordmark-reverse.svg` | On the ink ground. Full stop goes highlighter yellow, since teal dies on dark. |
| `nursia-wordmark-black.svg` | One colour. Faxes, forms, single-plate print. |
| `nursia-wordmark-white.svg` | One colour on dark, photography, video lower-thirds. |
| `nursia-wordmark-teal.svg` | One colour where the brand needs to carry alone — merch, stamps, embroidery. |

### Stacked lockup
| File | Use |
| --- | --- |
| `nursia-stacked.svg` | Wordmark over `NCLEX PRACTICE QUESTIONS`. For square-ish placements where the brand is unfamiliar — directory listings, sponsor walls, print. |
| `nursia-stacked-reverse.svg` | The same on the ink ground. |

### App mark
The whole word is illegible below about 80px, so the square mark keeps the `n` and
the full stop — the letter it starts with and the one piece of colour anyone remembers.

| File | Use |
| --- | --- |
| `nursia-mark.svg` | Rounded square, ink ground. Avatars, app icons, favicons. |
| `nursia-mark-light.svg` | Paper ground, for dark UI chrome. |
| `nursia-mark-square.svg` | No corner radius, for platforms that mask their own. |
| `nursia-mark-{192,512,1024}.png` | Rasters for stores, manifests, and anywhere SVG is refused. |
| `favicon-32.png` | The one raster size that still matters. |

### Social
`nursia-og.svg` / `nursia-og.png` — 1200×630 card, ink ground with the highlighter
rule. Wired up as the site's default OG image.

## Rules

- **Clear space:** the height of the `n` on all four sides. The files already carry it.
- **Minimum size:** wordmark 90px wide on screen, 22mm in print. Below that use the mark.
- **The full stop is teal on light and yellow on dark.** It is never ink, and never
  the same colour as the letters, except in the deliberate one-colour cuts.
- **Do not** stretch, outline, add a shadow, rotate, re-colour the letters, tighten
  the tracking further, or place the colour wordmark on a mid-tone photograph — use
  `nursia-wordmark-white.svg` there.

## Wired into the app

`src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png`, `favicon.ico`, and
`manifest.ts` are all generated or fed from these files. Re-run the script after any
change to the mark and they update together.
