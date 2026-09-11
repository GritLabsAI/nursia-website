# Flowsheet — the Nursia design language

The long-form written spec. Same content as `guide/` in plain text, for anyone
working in a terminal, a PR description, or a prompt.

Open `guide/index.html` if you would rather see it.

---

## 0. The idea

A flowsheet is the chart at the end of a hospital bed: ruled paper, small neat
labels, one thing circled because it matters. That is the whole design language.
Clinical paper ground, ink type, scrub-teal actions, and a single highlighter
stroke held back for the one thing on a surface that deserves it.

Nursia sells NCLEX-RN practice questions written and reviewed by nurses. The
people using it are tired, studying at eleven at night, and have already been
sold to by six other prep companies with purple gradients and a countdown timer.
The design has one job: **look like something a nurse wrote, not something a
growth team shipped.**

### Five rules that decide almost everything

1. **Paper, not white.** `#FBFAF6` is the default ground. White is reserved for
   cards, so a card always reads as an object sitting on the page.
2. **Three faces, one job each.** Sans shouts, serif explains, mono labels.
3. **One accent, one highlighter.** Teal for actions, yellow for the single most
   important phrase. Never a third colour, and never the two touching.
4. **Hairlines, not boxes.** 1px `#E3DFD4` separates things. No panel inside a
   panel, no shadow except the card's.
5. **Underfilled beats packed.** If a surface feels a little empty, it is right.

---

## 1. Colour

### Ground

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#FBFAF6` | The default background. Almost everything sits on this. |
| paper-2 | `#F4F2EB` | Second surface — inset panels, quiet blocks, a picked answer row. |
| white | `#FFFFFF` | Cards only. Never a page background. |

### Type and rules

| Token | Hex | Use |
| --- | --- | --- |
| ink | `#14161A` | Headlines, the wordmark, one dark band per page. |
| ink-2 | `#3A3D44` | Body copy. |
| muted | `#6E6B63` | Mono labels, eyebrows, captions, fine print. Warm grey, never blue-grey. |
| rule | `#E3DFD4` | Hairlines and card borders. 1px, never thicker, never a second tone. |

### Action and emphasis

| Token | Hex | Use |
| --- | --- | --- |
| teal | `#0B6B62` | Buttons, links, ticks, the full stop in the logo. |
| teal-dark | `#084F49` | Hover and pressed only. A state, not a colour you design with. |
| highlight | `#F5E85C` | The highlighter stroke. One per surface, behind one phrase. |
| correct | `#157F52` | Correct-answer border, on `#F3FAF5`. |
| wrong | `#B23A2E` | Wrong-answer border, on `#FDF5F3`. Also the exam clock's last five minutes. |

### Colour rules, in full

No gradients. No drop shadows except the card's. No glow. No third accent
colour. Teal and highlighter never touch — put paper or ink between them. Green
and red are **states**, never decoration; a correct answer is the only thing on
the site allowed to be green.

### Contrast (against paper `#FBFAF6`)

ink 17.3:1 · ink-2 10.4:1 · teal 6.1:1 · wrong 5.7:1 · muted 5.1:1 ·
correct 4.8:1. White on teal 6.4:1. Paper on ink 17.3:1. Ink on the highlighter
14.3:1. Everything clears AA. `muted` and `correct` sit closest to the line, so
neither is used below 11px or for body copy.

---

## 2. Type

Three faces, all in `fonts/`, all SIL Open Font Licence.

**The split is the whole personality: sans shouts, serif explains, mono labels.**
Never set body copy in the display face, and never set a headline in the serif.

| Role | Face | Size / leading | Where |
| --- | --- | --- | --- |
| Hero | Bricolage Grotesque 800 | `clamp(38px, 5vw, 56px)` / 1.06 | One per page. Tracking −0.022em. |
| Section head | Bricolage Grotesque 700 | 25–34px / 1.1 | Opens a band. Always preceded by a mono eyebrow. |
| Sub-head | Bricolage Grotesque 600 | 18px / 1.25 | Card titles, cell titles, accordion summaries. |
| Body | Source Serif 4 400 | 17px / 1.72 | Everything anyone actually reads. Measure 42rem. |
| Small body | Source Serif 4 400 | 15px / 1.55 | Card copy, captions, footnotes. |
| UI / button | Bricolage Grotesque 600 | 15px | Buttons, nav, tabs. Tracking −0.01em. |
| Eyebrow | IBM Plex Mono 500 | 11px | Uppercase, 0.14em tracking, muted. |
| Data | IBM Plex Mono 400–600 | 13–72px | Counts, timers, IDs, answer keys. |

Mono is never used for a sentence someone has to read. The display face is never
used below about 14px, or for more than two consecutive lines of running text.

---

## 3. Space, shape, motion

Every measurement is a multiple of 4. What matters more than the numbers is the
ratio: **the gap between two bands should be larger than anything inside either
of them.**

| Step | Value | Used for |
| --- | --- | --- |
| hairline | 1px | Every border and rule. There is no 2px border. |
| tight | 8px | Between stacked answer rows; between a key and its label. |
| inner | 16px | Padding inside a small cell; gap in a card grid. |
| card | 22–24px | Padding inside the question card and card-like panels. |
| group | 40–48px | Between a heading block and the thing it introduces. |
| band | 64–96px | Vertical padding on a page section. |

| Constraint | Value | Why |
| --- | --- | --- |
| Page container | 1140px | Outer width of every band. Side padding 24px mobile, 32px up. |
| Reading measure | 42rem | ~68 characters at 17px. All prose is capped here. |
| Card width | 560px max | Wider than this and it stops looking like a card. |
| Tap target | 44px min | Every button and answer row. Non-negotiable. |

| Shape token | Value |
| --- | --- |
| radius-card | 4px — the question card and card-sized surfaces |
| radius-control | 3px — buttons, answer rows, cells, calculator keys |
| radius-chip | 2px — the answer key square and anything under 32px |
| border | 1px `#E3DFD4`. A darker border means a state, not a level. |
| shadow-card | `0 1px 0 rgba(20,22,26,.04), 0 10px 24px -18px rgba(20,22,26,.35)` — the only shadow in the system |

### Motion

Motion confirms that something happened. It never entertains.

| Move | Timing | Where |
| --- | --- | --- |
| State change | 120–160ms ease | Hover and press on buttons, rows, keys. |
| Reveal | 380ms `cubic-bezier(.2,.7,.3,1)`, opacity + 4px rise | A rationale appearing after submit. |
| Highlighter swipe | 620ms, same curve | The stroke drawing itself in, once, on the hero only. |

Nothing loops. Nothing parallaxes. Nothing animates on scroll more than once.
`prefers-reduced-motion` cuts every duration to 0.001ms and disables smooth
scrolling.

---

## 4. Accessibility

- **Never colour alone.** A correct row carries a border, a fill *and* a coloured
  key — three signals, so meaning survives without colour vision.
- **Focus is visible and teal.** 2px outline, 2px offset, 2px radius. Never removed.
- **44px targets everywhere**, including answer rows, which are buttons.
- **Native elements first.** The FAQ is `<details>`, so it works with JavaScript
  off and is crawlable.

---

## 5. The logo

Full detail in `logos/README.md`. The short version:

- `nursia-wordmark.svg` — primary. Ink letters, teal full stop, any light ground.
- `nursia-wordmark-reverse.svg` — on the ink ground. The full stop goes
  highlighter yellow, because teal dies on dark.
- `nursia-wordmark-white.svg` — on photography and video.
- `nursia-wordmark-black.svg` / `-teal.svg` — one-colour cuts for print and merch.
- `nursia-stacked.svg` — wordmark over `NCLEX PRACTICE QUESTIONS`, for square
  placements where the brand is unfamiliar.
- `nursia-mark.svg` — the `n.` square, below ~80px and for avatars and app icons.
- `nursia-og.svg` / `.png` — the 1200×630 social card.

**Clear space** = the height of the `n` on all four sides; the files carry it.
**Minimum size** 90px wide on screen, 22mm in print.
**The full stop is teal on light and yellow on dark** — never ink, never the
same colour as the letters, except in the deliberate one-colour cuts.

Never stretch, rotate, outline, shadow, re-colour the letters, tighten the
tracking further, re-type it in Bricolage, or put the colour wordmark on a
mid-tone photograph.

---

## 6. The signature object: the question card

White `#FFFFFF`, 1px `#E3DFD4` border, 4px radius, one very soft shadow. Inside:

- A mono eyebrow (topic or item type), 11px uppercase, muted.
- The stem, in serif — or the display face for a very short one.
- Four options, each its own bordered row: 1px rule border, 3px radius, white,
  with a small square mono key (`A` `B` `C` `D`) at the left.

States go on `data-state`, not on a class:

| State | Border | Fill | Key |
| --- | --- | --- | --- |
| *(unset)* | rule | white | muted |
| `picked` | ink | paper-2 | ink |
| `correct` | `#157F52` | `#F3FAF5` | `#157F52` |
| `wrong` | `#B23A2E` | `#FDF5F3` | `#B23A2E` |

This card is the most recognisable thing the brand owns. Most pages and most ads
should be built around one.

---

## 7. Other components

- **Buttons.** Three, no more. 3px radius, 44px min height, display face 600.
  `btn-primary` teal on light; `btn-invert` highlighter yellow on ink;
  `btn-ghost` transparent with a 1px ink border. One primary per surface.
  Teal is never used on the ink ground.
- **Eyebrow.** Mono, 11px, uppercase, 0.14em, muted. Always directly above the
  thing it labels. Never a sentence, never alone in a block.
- **Highlighter stroke.** A background gradient at 88% of the line, 0.42em tall,
  cloned across line breaks. One per surface, behind one phrase.
- **Index cell.** White, 1px rule, 3px radius, no shadow. Border goes ink on
  hover; nothing lifts or scales.
- **Accordion.** Native `<details>`, hairline under each row, mono `+` / `−`.
  No chevrons, no boxes, no more than eight.
- **Exam chrome.** The calculator mirrors the one the real exam hands you —
  paper fill, mono digits, no colour. The clock goes red for the last five
  minutes and only then.
- **Stat strip.** The one place the faint chart-paper grid appears, and only on
  the ink ground. Mono numbers, at most one in highlighter yellow. Never a pass
  rate, never a user count.

---

## 8. Layout

A page is a stack of bands inside a 1140px container. Each band holds one idea,
opens with a mono eyebrow, and is separated from the next by space, not a box.

| Band | Ground | What it does |
| --- | --- | --- |
| Header | paper | Wordmark left, two or three links, one teal button. Hairline under it. |
| Hero | paper | Eyebrow, display headline with the one highlighter stroke, serif line, one button, usually a question card alongside. |
| Proof | ink + grid | The stat strip. |
| Explain | paper | Two or three bands of serif prose at 42rem. |
| Index | paper-2 | A grid of cells — topics, item types, guides. |
| Questions | paper | The accordion. |
| Close | ink or photo | One line, one button, the reverse or white wordmark. |
| Footer | paper | Mono links, fine print, the NCSBN non-affiliation notice. |

**One dark band per page.** The ink ground is a punctuation mark.

### Responsive

| Width | Container | What changes |
| --- | --- | --- |
| < 560px | 100% − 48px | Grids collapse to one column; hero card moves below the headline. |
| 560–900px | 100% − 64px | Four-up grids become two-up; the split rule stacks. |
| 900–1140px | 100% − 64px | Full layout, fluid. |
| > 1140px | 1140px | Container stops growing; bands still run full-bleed. |

Type barely scales down. Body copy stays at 17px on a phone — people read
rationales on phones, and shrinking the serif is the one change that would
actually hurt.

### Never on a page

A testimonial carousel. A countdown or "only 3 spots left". A pass rate, a score
claim, a user count. An illustration of a cartoon nurse — there are no
illustrations at all. Two accent colours, two dark bands, or a shadow on
anything that is not the card. A modal that interrupts someone mid-question.

---

## 9. Photography

Documentary, not stock. Someone studying, not someone celebrating. `photos/` is
the reference set; anything new has to sit next to it without looking borrowed.

- Natural light, usually late. Warm, slightly under-exposed, no fill.
- Nobody smiling at the camera. No eye contact, no thumbs up.
- No stethoscope cliché. These are students, mostly not in scrubs.
- Real surfaces — a cluttered table, a coffee cup, a phone face-down.
- Muted warm grade. No saturation, no teal-and-orange, no vignette.
- Shot loose, so a paper block or headline can sit on one third.

Type never sits directly on a busy frame. Either the photo takes a third and a
solid paper block takes the rest, or the type sits on ink with the photo beside
it. No scrim, no gradient overlay, no blur panel. A question card never sits on
a photo.

To brief new photography, hand over `for-chatgpt/photo-style-reference.png` plus
one line: *a nursing student studying at a kitchen table at night, natural light,
documentary, not smiling at camera, no stethoscope.*

---

## 10. Voice

Plain, calm, specific, anti-hype. Numbers instead of adjectives. Slightly
self-aware about being a small product. If a sentence would sound strange said
out loud by a tired nurse, it is not the voice.

- **Say the number.** "Fifty questions", not "plenty of practice".
- **Name the mechanism.** "The rationale is on every question, including the ones
  you got right" — not "smart learning".
- **Admit the limits.** Being small is a feature here.
- **Talk about the material, not the reader.** "Most repeat testers lose points on
  prioritization", never "You keep failing prioritization".
- **Stop.** One idea, one line, one action.

### House style

No exclamation marks, anywhere, including error messages. No emoji.
**Nursia**, capital N, never all-caps, and no full stop in running text — the
full stop belongs to the logo. **NCLEX-RN** on first mention, **NCLEX** after;
never "the NCLEX exam". Figures, not words. Sentence case for headlines, buttons
and nav; only mono eyebrows are uppercase. Contractions are fine and preferred.
Spaced en dashes. US English.

### Microcopy

| Moment | Say | Not |
| --- | --- | --- |
| Primary CTA | Start free | Get started now |
| Correct | Correct | Nice work! 🎉 |
| Wrong | Not this one | Oops! Try again! |
| End of free set | That's the 50. Here's what's in the rest. | Your trial has ended! |
| Empty state | Nothing here yet. | Looks like it's lonely in here… |
| Error | That didn't save. Try once more. | Oops! Something went wrong! |

### Never, in any surface

- A pass rate or score claim. Not in an ad, not in a footnote.
- A fabricated testimonial or a quote nobody said.
- An invented user count or social proof that is not literally counted.
- Anything implying NCSBN endorsement. NCLEX and NCLEX-RN are registered
  trademarks of the National Council of State Boards of Nursing; Nursia is not
  affiliated with, endorsed by, or sponsored by them, and the footer says so.
- Medical advice. This is exam preparation, never clinical guidance.
- A claim about the reader. Meta rejects copy that asserts something about the
  person seeing it — "Failed the NCLEX?" is a rejection; "Most repeat testers
  lose points on prioritization" is fine.

---

## 11. Ad creative

1080×1350 (4:5) by default; 1:1 and 9:16 are cut from the same layout, never
redesigned. Paper ground, or ink for one concept in a set — never white.
Left-aligned. Underfilled. One highlighter stroke in one ad out of a set, not in
every one. Logo small, bottom-left; it is never the hero. CTA is a small teal
rectangle, 3px radius, white text, about 44px tall — highlighter yellow with ink
text on the dark ground. The offer in every ad is the free tier: 50 questions,
no card, full rationales. Never a price, an upgrade, or a paid feature.

The six concepts that work are drawn to scale in `guide/ads.html`.
`AD-CONTEXT.md` and `for-chatgpt/START-HERE.md` hold the same system written as
a prompt — upload the three PNGs in `for-chatgpt/` with it, because image models
cannot be trusted to re-draw letterforms and a warped wordmark is the single
most common failure.

---

## 12. Engineering

`src/app/globals.css` is the source of truth: the `@theme` palette, the base
layer, and every component class (`.eyebrow`, `.prose-ns`, `.mark`, `.btn`,
`.qcard`, `.qopt`, `.cell`, `.acc`, `.calc-key`). Declaring colours in `@theme`
makes each one a utility — `bg-paper`, `text-ink-2`, `border-rule`. **Do not
write a raw hex in a component.** If the value is not in the theme, it is not in
the system.

`scripts/build-logo.mjs` generates every logo cut from one definition with the
letterforms outlined, and feeds the app icons, favicon and OG image.

`tokens/` carries the same values as `tokens.css`, `tokens.json` and
`tokens.scss` for anything outside the Next.js app. Nothing syncs them
automatically — change a colour in `globals.css` and update `tokens/` in the
same commit.

### Checklist before shipping a surface

- Ground is paper, not white. White appears only inside a card.
- Exactly one primary action. Exactly one highlighter stroke, or none.
- Every border is 1px `rule`. Nothing casts a shadow except a card.
- Headline in display, sentences in serif, labels in mono. No exceptions.
- Every tappable thing clears 44px.
- Focus ring present, teal, 2px, not overridden.
- Colour is never the only signal for a state.
- No pass rate, no invented count, no fabricated quote, no NCSBN implication.
- Read it out loud. If it sounds like a growth team wrote it, rewrite it.
