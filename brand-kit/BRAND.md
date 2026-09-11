# Nursia — brand kit

NCLEX-RN practice questions, written and reviewed by nurses.
Design system name: **Flowsheet** — clinical paper ground, ink type, scrub-teal
actions, and one highlighter stroke reserved for the single most important thing
on a surface.

> **This is the two-minute version.** The full design language is eight HTML
> pages at [`guide/index.html`](guide/index.html), and the same thing in plain
> text at [`DESIGN-LANGUAGE.md`](DESIGN-LANGUAGE.md).

---

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#FBFAF6` | The default background. Every ad sits on this unless it sits on ink. |
| paper-2 | `#F4F2EB` | Second surface — inset panels, quiet blocks. |
| white | `#FFFFFF` | Cards only. A card on paper is the signature object. |
| ink | `#14161A` | Headlines, wordmark, the dark ground. |
| ink-2 | `#3A3D44` | Body copy. |
| muted | `#6E6B63` | Mono labels, captions, fine print. |
| rule | `#E3DFD4` | Hairlines and card borders. 1px, never thicker. |
| teal | `#0B6B62` | Buttons, links, the tick, and the primary logo tile. |
| teal-dark | `#084F49` | Teal pressed/hover only. |
| highlight | `#F5E85C` | The highlighter stroke. One per layout, maximum. |
| correct | `#157F52` | Correct-answer state (border + `#F3FAF5` fill). |
| wrong | `#B23A2E` | Wrong-answer state (border + `#FDF5F3` fill). |

Rules: no gradients, no drop shadows except the card's, no glow, no third
accent colour. Teal and highlight never touch each other.

---

## Type

Three faces, all in `fonts/`, all open-licence.

| Role | Face | How it is used |
| --- | --- | --- |
| Display | **Bricolage Grotesque** ExtraBold/Bold | Headlines. Tracking −0.022em, line-height 1.06. Also the UI/button face at 600. |
| Body | **Source Serif 4** Regular | Sentences and paragraphs. 17px/1.68. Never headlines. |
| Mono | **IBM Plex Mono** Regular–SemiBold | Numbers, eyebrows, labels, prices, question IDs. Eyebrows are 11px, uppercase, letter-spacing 0.14em, muted. |

The split is the whole personality: **sans shouts, serif explains, mono labels.**
Never set body copy in the display face, and never set a headline in the serif.

---

## Logo

Files in `logos/`. Full guidance in `logos/README.md`. The short version:

**v2: there is no full stop.** Its colour moved into a rounded tile carrying the
`n`, and the tile changes colour with context. The word is always one colour.

- `nursia-logo.svg` is the default — teal tile, paper `n`, ink word, on any light ground.
- `nursia-logo-reverse.svg` on the ink ground — the primary highlighter tile,
  there — the primary tile, on dark as on light.
- `nursia-logo-photo.svg` over photography; `nursia-wordmark.svg` for the word alone.
- `nursia-mark.svg` (the `n` tile) below ~120px wide, and for avatars and app icons.
- Eight approved tiles: teal, yellow, ink and paper, plus results, night, plum and
  bronze for one context each. One per surface. The word never matches the tile.
- Clear space = the height of the `n` on all four sides.
- Minimum lockup width 120px on screen; the word alone 90px.
- Never add a dot back, stretch, rotate, outline, shadow, re-colour the word, or
  put the ink logo on a mid-tone photo.

---

## The signature object: the question card

White `#FFFFFF`, 1px `#E3DFD4` border, 4px radius, one very soft shadow.
Inside it:

- A mono eyebrow label (topic or item type), 11px uppercase, muted.
- The stem in the display face, or in serif for longer stems.
- Four options, each its own bordered row: 1px rule border, 3px radius, white,
  with a small square mono key (`A` `B` `C` `D`) at the left.
- The correct row turns green: `#157F52` border on `#F3FAF5`.
  A wrong row turns red: `#B23A2E` border on `#FDF5F3`.

This card is the most recognisable thing the brand owns. Most ads should be
built around one.

---

## Voice

Plain, calm, specific, anti-hype. No exclamation marks, no countdowns, no
"crush the NCLEX", no "unlock". Numbers instead of adjectives. Slightly
self-aware about being a small product.

Never in an ad: a pass-rate or score claim, a fabricated testimonial, an
invented user count, or anything implying NCSBN endorsement. Meta also rejects
copy that asserts something about the viewer — "Failed the NCLEX?" is a
rejection; "Most repeat testers lose points on prioritization" is fine.

---

## Files

```
guide/    the design language as eight HTML pages — start at guide/index.html
tokens/   tokens.css, tokens.json, tokens.scss
logos/    every logo cut, SVG + PNG, plus the full usage README
fonts/    Bricolage Grotesque, Source Serif 4, IBM Plex Mono (+ OFL licences)
photos/   the photography already shot for the site — the look to match
DESIGN-LANGUAGE.md  the full written spec
AD-CONTEXT.md       paste this into ChatGPT before asking for static ads
```
