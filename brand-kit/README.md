# Nursia brand kit

NCLEX-RN practice questions, written and reviewed by nurses.
Design system name: **Flowsheet**.

## Start here

**Open [`guide/index.html`](guide/index.html) in a browser.** Eight pages
rendered in the design language itself, so the reference is also the reference
implementation.

> The pages work straight off the file system, but Chrome refuses to load local
> font files over `file://`, so the three faces come from Google Fonts there.
> For a fully offline render, serve the folder — `npx serve brand-kit` or
> `python -m http.server` from inside it — and the bundled fonts are used.

## What is here

```
guide/              The design language as eight HTML pages
  index.html          Overview — the idea and the five rules
  foundations.html    Colour, type, space, shape, motion, accessibility
  logo.html           Every cut, clear space, minimum size, misuse
  photography.html    The reference set and how type sits on it
  components.html     Live components: card, buttons, states, furniture
  patterns.html       Page anatomy, four layout patterns, breakpoints
  voice.html          Voice, house style, microcopy, hard limits
  ads.html            Six ad concepts drawn to scale, plus compliance
  code.html           Tokens, recipes, and the shipping checklist

tokens/             tokens.css · tokens.json · tokens.scss
logos/              Every logo cut, SVG + PNG, plus logos/README.md
fonts/              Bricolage Grotesque, Source Serif 4, IBM Plex Mono (+ OFL)
photos/             The photography shot for the site — the look to match
for-chatgpt/        Three logo PNGs and a paste-ready prompt for ad creative

BRAND.md            The one-page written summary
DESIGN-LANGUAGE.md  The full written spec — same content as guide/, in text
AD-CONTEXT.md       Paste into ChatGPT before asking for static ads
```

## The short version

Paper `#FBFAF6` ground, not white — white is for cards. Ink `#14161A` headlines
in Bricolage Grotesque, body copy in Source Serif 4, labels and numbers in IBM
Plex Mono. Scrub teal `#0B6B62` for actions, highlighter yellow `#F5E85C` behind
one phrase per surface. 1px `#E3DFD4` hairlines, no gradients, no shadows except
the card's. Underfilled beats packed.

Everything is built around one object: the white question card with four
bordered answer rows and a small mono key.

## Licences

The three typefaces are SIL Open Font Licence 1.1 — free to embed, ship and
subset. The licence text ships with each in `fonts/`. Logos, photography and
copy are Nursia's.

NCLEX and NCLEX-RN are registered trademarks of the National Council of State
Boards of Nursing. Nursia is not affiliated with, endorsed by, or sponsored by
the NCSBN.
