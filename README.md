# Nursia

NCLEX-RN practice questions, built from the `Nursia Wireframes.dc.html` design-canvas
spec (Claude Design project `5ae6eee2`). Next.js 16 App Router, Tailwind v4, fully
static — 35 prerendered pages, no database.

```bash
npm run dev     # http://localhost:3000
npm run build   # static export of every route
```

## The argument the site is built on

At stage 0 there is no social proof to lean on, so **the product is the proof**: a real,
answerable NCLEX question with a full rationale sits on the homepage, the hub, every topic
page, every guide, and the 404. All of it renders in static HTML, so it is crawlable
without JavaScript — which matters, because those pages are the only free acquisition
channel.

## Routes

| Route | Wireframe | What it is |
| --- | --- | --- |
| `/` | 1b + 1d | Hero is a live 3-question set; coverage map, facts, reviewers, pricing, FAQ |
| `/nclex-practice-questions` | 2e | SEO hub — 10 free questions, all 8 topics, question types, FAQ |
| `/nclex-practice-questions/[topic]` | 2f | 8 instances — 5 free questions, subtopic table, siblings |
| `/guides` | 3b | Guides hub, clustered by where the reader is in their prep |
| `/guides/[slug]` | 2g | 9 instances — short answer, sections, one live question |
| `/nclex` | 3a | Full index: every set, guide, and tool |
| `/pricing` | 2b | One plan, free tier, four objections |
| `/about` | 2c | Founder letter, named reviewers, the 4-step item process |
| `/contact` | 4a | Form + deflection + visible email address |
| `/signup` | 5a | The gate — two fields, free tier spelled out, escape hatch |
| `/try` | 5b | Post-auth first session with the free-tier counter |
| `/terms`, `/privacy`, `/refunds` | 6a | Legal row from the footer |

## Fixed CTA slots

Every page uses the same five slots and the same three words, and every CTA lands on
`/signup` — never on pricing.

1. Nav — `Start free`, persistent, top right
2. Above the fold — `PrimaryCta`, plus "no card needed"
3. Inline mid-content — `InlineCta`, phrased as a question, long pages only
4. End of content — `CtaBand`, full-width dark band
5. Sticky mobile bar — `StickyCta`, after 50% scroll on SEO pages

## Design system

`src/app/globals.css` holds the whole token set. Clinical paper ground (`--color-paper`),
ink type, scrub teal for actions, and a highlighter yellow spent on exactly one thing per
page — the correct answer, and one phrase in each H1. Bricolage Grotesque for display and
UI, Source Serif 4 for question stems and article bodies, IBM Plex Mono for anything
checkable (counts, percentages, item IDs).

## What is stubbed

**Auth.** `src/lib/session.ts` records a session in `localStorage` so the gate and the
post-auth pages are walkable end to end. Replace `signIn` / `getSession` / `signOut` with
real auth calls and no UI changes are needed. `/signup`, `/login`, and `/try` are excluded
from the sitemap and `robots.txt` already.

**Contact form** resolves client-side into its success state; wire the submit handler to
a real endpoint.

**Questions.** Ten items live in `src/lib/content.ts` and are reused across pages. The
counts on the coverage map (1,200 total) describe the intended bank, not what is in this
repo.
