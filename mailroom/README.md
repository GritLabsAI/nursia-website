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
| Answering inside the email (AMP) | `lib/quiz-amp.ts` posts to `/api/quiz/amp`; sent over Resend SMTP |
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

## Daily quiz

`nursia-daily` and `prepclever-daily` (Automations → "… daily quiz") send the
three-question email once a day from 09:00 India time to everyone onboarded who
used the app in the last 14 days (both adjustable on the page). Paying members
and people onboarded before the flow existed get it too. PrepClever questions
come from each person's own exam. Clicking an answer marks it on `/q/…`; when
the last one is answered, `lib/quiz-results.ts` emails the score with every
question, their answer, the right one and the explanation, once per set
(`quiz_results` table). Like the onboarding flows, nothing sends until
"Send automatically" is switched on.

### Answering inside the email

The daily quiz also carries an AMP part (`lib/quiz-amp.ts`), so in Gmail,
Yahoo and Mail.ru the questions are answered in the email itself: a tap posts
to `/api/quiz/amp`, which records it and sends back the marking, explanation
and score. Resend's API has no AMP field, so any email with an AMP part goes
through Resend's SMTP relay instead (`lib/resend.ts`); scheduled sends stay on
the API with HTML only. Every other client, and Gmail until the sender is
registered, shows the HTML part with its answer links as before.

Before Gmail shows it:

1. SPF, DKIM and DMARC must pass for the sending domain.
2. Test in your own Gmail: Settings → General → Dynamic email → Developer
   settings, add the sender address, then send a test from the composer.
3. Register each sender with Google
   (https://developers.google.com/workspace/gmail/ampemail/register), which
   asks for a real production email sent to ampforemail.whitelisting@gmail.com.

Check a change with `npx amphtml-validator --html_format AMP4EMAIL <file>`:
Gmail drops an AMP part that fails it and shows the HTML part.
