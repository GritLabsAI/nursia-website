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

## seed-questions.mjs

Mirrors the question bank in `src/lib/bank` into the `questions` collection in
Firestore, plus a `meta/bank` document holding the total and the per-topic
counts.

```bash
node scripts/seed-questions.mjs --dry-run    # report, write nothing
node scripts/seed-questions.mjs              # write
node scripts/seed-questions.mjs --prune      # write, and delete strays
node scripts/seed-questions.mjs --emulator   # against the local emulator
```

The bank stays the source of truth and stays what the site renders — the public
pages ship their questions in the server HTML, which only works if the questions
are in the bundle. This is a mirror, so that the data is somewhere queryable:
which item is missed most, which topic is thin, what changed between releases.

Idempotent, and it says what it did. Every question carries a content hash, so a
second run reports `0 added, 0 updated, 200 unchanged` rather than rewriting the
collection. Questions that have left the bank are reported and left alone unless
`--prune` says otherwise.

It needs a service account — a real secret, unlike the web config in
`.env.local`. Set `FIREBASE_SERVICE_ACCOUNT` to the JSON or
`GOOGLE_APPLICATION_CREDENTIALS` to its path, or pass `--emulator`.

## test-rules.mjs

Asserts what `firestore.rules` actually allows, against the emulator. There is
no server in this project, so those rules are the whole of the access control.

```bash
npx firebase emulators:start --only firestore --project nursia-local
node scripts/test-rules.mjs
```

Covers the things worth being sure of: another account cannot read or write your
attempts, a signed-out browser cannot either, an attempt cannot be updated after
the fact (a wrong answer must not become a right one), malformed attempts are
refused, the bank is readable only with an account and writable by nobody, and
everything outside the named collections is closed.
