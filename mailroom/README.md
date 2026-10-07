# Mailroom

Email for Nursia and PrepClever: compose and schedule campaigns, automatic
onboarding emails, interactive daily questions, and live open/click results.

Live at https://mailroom-gray.vercel.app (Vercel project `gritlabsai/mailroom`),
behind Google sign-in for gritlabsai.co, nursia.io and prepclever.in accounts.

## How it fits together

| Piece | Where |
|---|---|
| Dashboard | `public/` (static app), served at `/`, API in `app/api/[...path]` |
| Records (lists, emails, sends, answers) | Neon Postgres, `scripts/migrate.mjs` |
| Every-5-minute check (new onboardings, due emails) | QStash schedule → `/api/cron/tick` |
| Big sends | queued in chunks through QStash → `/api/jobs/send` |
| Live results | Resend webhook → `/api/webhooks/resend` (signed) |
| Answer links in emails | `/q/<token>`, marked by `lib/quiz.ts`, page in `lib/quiz-page.ts` |
| Unsubscribe | `/unsubscribe` |
| Templates + Nursia question bank | compiled into `lib/content.generated.ts` |

App data is only ever read: Nursia and PrepClever over their Supabase APIs,
PostHog for behaviour audiences.

## Commands

```
npm run dev                         # local, http://localhost:3000 (no sign-in until GOOGLE_CLIENT_ID is set)
npm run content                     # after editing internal/email/templates, onboarding or src/lib/bank
npm run db:migrate                  # create tables (safe to re-run)
npx vercel deploy --prod --scope gritlabsai
npm run schedule -- https://mailroom-gray.vercel.app   # re-link QStash + Resend webhook after an address change
```

Secrets live in `.env.local` locally and in the Vercel project settings. Don't run
`vercel env pull`, because it overwrites `.env.local` with only the Vercel-managed values.

## Mailboxes

Settings → Mailboxes holds every address a brand can send from, each with its
own sender name and reply-to. One per brand is the default: new emails start
from it and automatic emails always use it. An address can only be added if its
domain is verified on the Resend account, and the composer only offers a
brand's own mailboxes. "Send test" sends a plain note to check inbox placement.

## Uploaded templates

Templates → Upload template takes an HTML email from any editor, plus the
images it points at with relative paths (sent inside the email as inline
attachments, 3 MB in total). It's previewed and checked before saving: merge-tag
syntax, missing images, scripts and forms. If the HTML has no
`{{ unsubscribe_url }}`, Mailroom adds a footer with an unsubscribe link and the
postal address. Uploaded templates live in the `templates` table; archive one to
hide it from new emails, since sent emails keep pointing at it. Any built-in
template can be downloaded as a starting point.

The postal address defaults to the registered office (`DEFAULT_POSTAL_ADDRESS`
in `lib/db.ts`) whenever a brand's own is blank.

## Automatic onboarding

Both flows watch every 5 minutes. Everyone already onboarded when a flow first
looked is a "baseline" and never gets a welcome. New onboardings get the welcome
about 15–20 minutes later, and Nursia then follows the onboarding series on its
rules. Sending only happens once "Send automatically" is switched on in
Automations, and it stays paused while a brand's postal address is empty.
