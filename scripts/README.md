# scripts

## build-logo.mjs

Regenerates every cut of the wordmark into `public/logo/`, plus the App Router
icon files in `src/app/`. See `public/logo/README.md` for what each cut is for.

```bash
node scripts/build-logo.mjs
```

It needs the source font, which is not committed:

```bash
url=$(curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800" \
  | grep -o "https://fonts.gstatic.com[^)]*\.ttf" | head -1)
mkdir -p scripts/.fonts && curl -o scripts/.fonts/bricolage-800.ttf "$url"
```

The script serializes SVG path data itself rather than using opentype's
`toPathData()`, which emits `NaN` for some coordinates and silently drops whole
glyphs. It asserts the glyph count and rejects non-finite values before writing,
so a broken mark cannot ship.
