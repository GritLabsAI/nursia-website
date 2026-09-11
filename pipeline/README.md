# The content pipeline

Five stages that take "what should we publish" to "fifty pages that rank and
collect signups", and keep them honest afterwards.

```
npm run seo:migrate    # 1. the hand-written library -> Sanity   (one-time)
npm run seo:research   # 2. trends in, deduped briefs out
npm run seo:seed       # 3. resources, experiment, new guides, wiring
npm run seo:link       # 4. nothing left with zero inbound links
npm run seo:audit      # 5. what is broken, what is underperforming
```

Every stage takes `--dry` except the audit. Run it first, every time.

## What the pipeline is actually for

A content programme fails in two ways and neither looks like an error.

The first is **cannibalisation**: you publish a second page about a query you
already rank for, the two compete, and the cluster gets worse. Stage 2 exists
to make that impossible without a human overriding it.

The second is **pages that rank and collect nothing**. A guide with no offer on
it is indistinguishable from a finished page in every view except one, which is
why stage 5 has that view and the Studio has a "Not converting" list.

Everything else here is plumbing for those two.

## Where content lives

**Sanity is the source of truth.** Project `z92ivzd6`, dataset `production`.
The Studio is standalone:

```
cd studio && npm run dev     # localhost:3333
```

The **questions** are the exception and stay in `src/lib/bank/` and
`src/lib/content.ts`. They are versioned, reviewed in pull requests, and
rendered into static HTML, which is the reason these pages rank at all. A
`topic` document in Sanity is the editorial wrapper around a question set; the
`slug` is the contract between the two halves, and the pipeline refuses to
create a topic with no question set behind it.

`src/lib/guides-content.ts` and `src/lib/guides-trends.ts` are the **frozen
pre-Sanity snapshot**. Nothing the site renders reads them any more — their only
consumer is `01-migrate.ts`. Do not edit them expecting a page to change.

## Stage 1 — migrate

Transcribes the 45 hand-written guides, 20 topics and 3 credited nurses into
Sanity. A transcription, not an edit: paragraphs become Portable Text blocks
one-for-one, nothing is reworded, nothing is inferred.

Two passes, because `readNext` is a cyclic graph — pass one creates every
document, pass two fills in the references once all the ids exist.

Idempotent. Re-running patches rather than duplicating, which matters because
the first time anyone runs a migration against production it is usually twice.

## Stage 2 — research

Reads a trends source, throws away every query the library already answers, and
ranks what is left into `pipeline/data/briefs-<run>.json`.

### The trends source is pluggable, and here is why

Google Trends has **no free, official, general-access API**. There is an
official one in limited alpha behind an allowlist, and there is the endpoint the
public site calls — undocumented, aggressively rate-limited, and free to change
shape without notice. Every "Google Trends API" package on npm wraps the second.

Building publishing on that directly means content stops the week Google changes
a query parameter. So the pipeline depends on an interface instead:

| `TRENDS_SOURCE` | What it reads | When to use it |
| --- | --- | --- |
| `dataset` (default) | a committed, reviewed JSON file | always works, fully auditable |
| `browser` | the live endpoint, via a real browser | real numbers, rate-limited |
| `google` | the live endpoint, via `fetch` | almost always 429s; kept for reference |
| `csv` | a Trends / Ads / Ahrefs export | best data for long-tail volume |

```bash
npm run seo:research
TRENDS_SOURCE=browser npm run seo:research
TRENDS_SOURCE=browser TRENDS_PAUSE=10000 npm run seo:research
TRENDS_SOURCE=csv TRENDS_CSV=./keywords.csv npm run seo:research
npm run seo:research -- --take 12
```

### What running it live actually taught us

The `browser` adapter works — it has returned real weekly series for all 26
candidates. Four things were learned the hard way and are worth reading before
trusting or changing it.

**1. Trends numbers are not comparable unless measured together.** A
single-keyword query is normalised to *its own* peak, so everything comes back
with a maximum of 100. Measured separately, "compact nursing license" averages
79 and "nclex" averages 65 — and the truth is the other way round by a wide
margin. The adapter therefore compares terms *within one request* (Google's
limit is five) with a shared anchor riding in every batch, and expresses each
candidate as a ratio to that anchor.

**2. The anchor must be mid-volume.** The first run anchored on "nclex" and
returned 22 zeros out of 26. Trends reports integers on a 0-100 scale shared
across the comparison, so an anchor far larger than the candidates pins itself
near 100 and rounds everything else to nothing. The default is now
`nclex practice questions`. Override with `TRENDS_ANCHOR`.

**3. Trends will not report on long-tail phrases at all.** Ask it about
"nclex testing accommodations" and you get a flat zero, which means "below our
reporting threshold", not "nobody searches this". Hence the `probe` field in the
candidate file: a shorter head term measured *in place of* the query, with the
score attributed to the query. It is a proxy for the topic, not the phrasing,
and it is written down next to the query rather than derived, because a badly
chosen probe silently measures the wrong thing. **For actual long-tail volume,
use a keyword tool and the `csv` adapter — Trends is the wrong instrument.**

**4. It gets rate-limited, and the failure is disguised.** Sustained use makes
the widget endpoint 302 to `google.com/sorry/index`, Google's anti-abuse
interstitial. The in-page fetch cannot follow a cross-origin redirect, so it
surfaces as a bare `TypeError: Failed to fetch` — which reads like a network
fault and sends you looking at cookies, CSP and headless detection instead. The
adapter now detects the redirect and says what it is.

The correct response to that block is to wait or to use another source, and the
adapter does not try to get around it. Solving the interstitial, rotating
addresses, or disguising the browser would be circumventing an anti-abuse
control; there is an offline source for exactly this situation and it is the
default.

Two smaller notes: the adapter runs **headed**, because Google blocks the
endpoint for headless Chrome — the page loads fine and then every API call
fails, which is its own hour of confusion. And `playwright-core` drives an
already-installed Edge or Chrome rather than downloading a browser.

`pipeline/data/keywords-2026-09.json` is the candidate list: the queries worth
asking about, each with the reasoning, the probe term, and its sources. The
interest values in it are **calibrated estimates on the Trends 0-100 scale, not
readings taken from the endpoint** — the file says so. Running with `browser` or
`csv` replaces them with observed numbers.

Each run writes two files:

- `briefs-<run>.json` — what to write, ranked, with the rejections and why.
- `measurements-<run>-<source>.json` — the whole market as measured, including
  the queries that were rejected. Tagged by source so a dataset run cannot
  overwrite a live one. This is the file to diff between runs: it is what tells
  you a query you already cover has doubled, which is a refresh worth doing and
  is invisible from the briefs alone.

### Dedupe

A query counts as covered when IDF-weighted token overlap against the existing
titles and slugs clears **0.65**.

Weighting by inverse document frequency is the whole trick: nearly every query
in this category contains "nclex", so plain overlap decides everything covers
everything. IDF makes "nclex" worth almost nothing and "accommodations" worth a
great deal.

The matcher shows its working — each rejection names the guide that beat it and
the score — because it **will** be wrong sometimes. It was wrong twice on the
first run:

- `sata` and "select all that apply" are the same thing and token overlap cannot
  know it. It scored 0.64 against a 0.65 threshold and nearly produced a
  duplicate of `/guides/how-to-answer-sata`. Fixed with an explicit alias list
  (`ALIASES` in `02-research.ts`) — add to it whenever a rejection looks wrong.
- Ties were resolved arbitrarily, so a covered query was attributed to the wrong
  guide. Now broken toward the more focused one.

Both live in the code with the reasoning attached. Neither is a general
solution, and that is fine — the point is that a wrong call is visible.

## Stage 3 — seed

In order, because each depends on the last:

1. the free resources (`pipeline/data/resources-2026-09.ts`)
2. the funnel experiment
3. this run's new guides (`pipeline/data/drafts-2026-09.ts`), carrying the
   research provenance that justified them
4. **every guide in the library** matched to a resource and to the experiment

Step 4 is what turns a content library into a funnel. Five new pages change very
little; giving all fifty a relevant offer changes what every already-ranking page
does when somebody lands on it.

```bash
npm run seo:seed
npm run seo:seed -- --reassign   # re-apply matching to guides that already have one
```

Without `--reassign` a guide that already has a resource is left alone, so an
editor's reassignment survives the next run.

### How a resource is matched

Most specific wins: **explicit guide slug → question topic → journey stage →
fallback**.

A guide's `topic` turns out to be a weak signal outside the `content` cluster —
it was chosen to answer "which question set should this page link to", so a
guide about choosing a state board carries `safe-care` and one about Filipino
candidates carries `prioritization-delegation`. Matching on topic alone put 20 of
45 guides behind the prioritization tree, including several about registration
paperwork. Hence: subject-bearing topics only, journey stage for the process
pages, and explicit lists where a human already knows better.

## Stage 4 — link

A guide with no inbound links is reachable only through the sitemap and a search
result. It ranks slower and receives none of the authority the cluster has built.

Fixes it by editing the **linking** guide, never the orphan — links carry value
in one direction. Uses an editorial map first (`EDITORIAL` in `05-link.ts`), then
cluster and topic affinity, and prints which rule it used for every link so a bad
automatic choice is visible.

Appends rather than replaces and respects the schema's limit of four, so a
hand-curated "read next" is never silently rewritten.

## Stage 5 — audit

```
ERROR   the page is wrong or unreachable — missing topic, duplicate slug.
WARN    the page works and is underperforming — no resource, orphaned, stale.
```

Exits non-zero on errors, so it can gate a deploy. Run it after every pipeline
run and on a schedule afterwards — the stale check only becomes useful months
later, which is exactly when nobody thinks to look.

Two things in it were calibrated against the real library rather than guessed,
and both are worth knowing before you change them:

- **Word counts use `sections[].body[].children[].text`, not `pt::text`.**
  `pt::text` does not flatten an array *of arrays* of blocks, so it silently
  returns a fraction of the page and reports every guide as thin.
- **`THIN_WORDS` is 300.** Whole-page prose here runs from about 240 words up;
  the house style is short and dense. At 450 the audit flagged 30 of 50 pages,
  which is not a signal — it is noise that gets ignored and then deleted.

## Conventions

- **Upsert by slug, never by a derived `_id`.** Sanity's own guidance, and it
  matters here: deriving `_id` from the slug looks tidier and means a renamed
  slug silently creates a second document while the first one keeps ranking.
- **Patch, don't replace.** An editor may have fixed a sentence since the last
  run. A pipeline that stamps over human edits gets turned off within a week.
- **Where a fact belongs to a regulator — a fee, a waiting period, which
  evaluation service a state accepts — the guide says to check the board**
  rather than freezing a number that changes without warning. A confidently
  wrong filing deadline is worse than no guide at all.

## Environment

Read from `.env.local` by the npm scripts (`tsx --env-file`). Calling `tsx`
directly will fail with a clear message rather than a 401 per document.

```
NEXT_PUBLIC_SANITY_PROJECT_ID   public
NEXT_PUBLIC_SANITY_DATASET      public
SANITY_API_WRITE_TOKEN          secret — can rewrite the whole content lake
SANITY_API_READ_TOKEN           secret — draft previews only
SANITY_REVALIDATE_SECRET        shared with the Sanity webhook
```

## Publishing an edit

Edits reach the live site in seconds rather than on the next deploy, through the
webhook in `src/app/api/revalidate/route.ts`. Configure it once in Sanity Manage
— the exact filter and projection are in the comment at the top of that file.
Without it, pages are at worst an hour stale (the `revalidate` backstop), which
is the failure mode to expect if somebody rotates the secret.
