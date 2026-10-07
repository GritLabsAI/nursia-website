# Email campaigns

A local dashboard for sending the Nursia and PrepClever templates through
Resend and watching how they do.

```
npm run email        # → http://localhost:4410
```

Needs `RESEND_API_KEY` and `EMAIL_UNSUB_SECRET` in `.env.local` (see
`.env.example`).

## What's where

| | |
|---|---|
| `../templates/` | The 8 lifecycle emails (daily question, welcome, diagnostic nudge, cart recovery) for both brands |
| `../onboarding/` | The 5-email Nursia onboarding sequence, also sendable from here |
| `../.data/db.json` | Contact lists and send history. Gitignored, stays on this machine |
| `src/app/api/email/unsubscribe` | The one public piece, deployed with the site |

## How a send works

1. Import a CSV on **Contacts**. `email` is required; every other column
   (`first_name`, `referral_code`, `streak_days`…) becomes a merge field.
2. **New campaign**: pick a template and list. Merge fields the CSV doesn't have
   can be set once for everyone. Preview updates live; **Send test** mails you a copy.
3. **Review & send** runs pre-flight checks, then sends one email per contact,
   skipping anyone suppressed. Each email gets a signed unsubscribe link and
   RFC 8058 one-click `List-Unsubscribe` headers.

## Everyday templates

Each brand has six generated emails: finish setting up, start with one question,
checkout reminder (no discount), what full access adds, pick up where you left off,
and exam countdown. Each has a matching audience suggestion in the composer. They
come from `../templates/build-basics.cjs`, which reuses each brand's welcome-email
header and footer. Edit the copy there and rerun
`node internal/email/templates/build-basics.cjs`. Every product claim is checked
against the pricing page (Nursia) or the in-app paywall (PrepClever), and every link
is a route that exists in that app.

## Audiences (Supabase + PostHog)

**Audiences** builds a list from the app instead of from a CSV:

- **Supabase segment** offers presets over `auth.users` + `profiles`: all users,
  lifecycle state, never onboarded, onboarded but never practised, gone quiet,
  on a streak, started checkout but didn't pay, saw the paywall, subscribers,
  free users, and exam coming up. Some are Nursia-only because PrepClever's schema
  lacks the tables.
- **PostHog behaviour** finds people who did event X at least N times in the last
  N days (optionally excluding anyone who did Y), or people in a saved cohort.
  PostHog persons have no email, so the tool resolves them through Supabase,
  because PostHog's identified distinct id is the Supabase user id.
- **Custom SQL** runs any `select` that returns an `email` column.

All Supabase reads run in a `READ ONLY` transaction with a 20s timeout. Misspelled
inbox domains (`gmai.com`, `gmail.co`…) are dropped before they can bounce.
Saved lists remember their query: **Refresh from source** on the list page re-runs it,
and the send check warns when a built list is more than 6 hours old.

Presets and PostHog lookups need `SUPABASE_URL_<BRAND>` + `SUPABASE_SECRET_KEY_<BRAND>`.
The tool reads `auth.users` through the Auth admin API and tables through PostgREST,
then filters in memory, and only ever sends GETs. Custom SQL also needs
`SUPABASE_DB_URL_<BRAND>` (Session pooler URI). PostHog needs `POSTHOG_PERSONAL_API_KEY`
(query:read, cohort:read) + `POSTHOG_PROJECT_ID`. Addresses at reserved test
domains (`example.com` etc.) are dropped too.

## Onboarding flow

**Onboarding flow** runs the five-email sequence from `../onboarding/README.md`
as numbered steps. Each step is a rule over the account's current Supabase state
plus which steps it has already had (stored per Supabase user id in `.data`).
The rules are re-checked every time the page loads:

| Step | Who's due |
|---|---|
| E1 · Your plan | Finished onboarding, created in the last N days (7), not had E1 |
| E2 · Activation nudge | Had E1 ≥ N h ago (24), still 0 questions answered |
| E3 · Your numbers | Had E1 ≥ N h ago, has answered ≥ 1 question |
| E4 · Win-back | Had E3, quiet ≥ 72h, > 10 free questions left, none in 14 days |
| E5 · Conversion | Had E3, and ≤ 10 free left or E1 ≥ 21 days ago (wins over E4) |

Paying subscribers, unsubscribes, bounces, internal accounts and bad addresses
never get a flow email. Each step shows how many people are due, lets you preview
the email, send a test, and **Send to N**. Each run is a normal campaign, so its opens
and clicks appear in Campaigns. **Send automatically every hour** is off by
default. Like **Send all due steps**, it refuses to send while the unsubscribe page
is down or the postal address is blank.

Until the app tracks `quiz_completed`, "practised" means
`questions_answered_count ≥ 1` or any NGN attempt, and free questions left is
50 minus answered.

## Where the numbers come from

The dashboard reads each email's `last_event` from Resend. It syncs every 5 minutes while
it's running, or when you press **Sync from Resend**. Bounces and spam complaints
are suppressed automatically. Unsubscribes are stored as Resend contacts with
`unsubscribed: true` and are pulled in before every send.

Opens only count if **open tracking is on for the sending domain** (Settings).
It's a domain-wide switch in Resend, so it applies to support mail from that
domain too.

## Before mailing a real list

- Fill in a postal address per brand in Settings (CAN-SPAM).
- Deploy the site with `RESEND_API_KEY` and `EMAIL_UNSUB_SECRET` set, using the same
  secret as `.env.local`, or unsubscribe links will 404.
- Turn on open (and optionally click) tracking for the domains you send from.
