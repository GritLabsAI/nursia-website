# Onboarding lifecycle: activation to retention to conversion

Five emails, wired to product events rather than a fixed calendar. A user who
activates in ten minutes and one who takes four days both get the right email
at the right moment, because the sequence watches for what they actually did,
not how many days have passed since sign-up.

Voice follows `brand-kit/guide/voice.html`: no exclamation marks, no emoji, no
pass-rate or user-count claims, no urgency, nothing asserted about the reader.
Signed "The Nursia team" — no named reviewers, since fabricated bylines were
taken down in `835e438`.

## The three stages

**Activation** — get a signed-up account to finish its first quiz. Everything
before that event is a nudge, not a nurture; there is nothing to personalize
yet because there is no data yet.

**Retention** — once activated, keep the account coming back. This is where
the emails use the account's own numbers (weakest topic, accuracy) and where
a quiet account gets pulled back in before it goes cold, rather than on a
fixed day whether or not it needed pulling.

**Conversion** — say the price, once, when it's actually relevant: either the
free tier is about to run out, or enough time has passed that it's a fair
question to ask regardless.

## The flow

```
                          onboarding_completed
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ E1 · Welcome       │  send immediately
                         └─────────┬──────────┘
                                   │
                        wait 24h, watching for
                        quiz_completed ≥ 1
                                   │
                    ┌──────────────┴──────────────┐
              still 0 at 24h                  fired already
                    │                               │
                    ▼                               │
         ┌───────────────────────┐                  │
         │ E2 · Activation nudge │                   │
         └───────────┬───────────┘                   │
                      │                               │
        stays enrolled, no timeout,                   │
        until quiz_completed ≥ 1                      │
                      │                               │
                      └───────────────┬───────────────┘
                                       ▼
                         wait 24–48h after that
                         first quiz_completed event
                                       │
                                       ▼
                         ┌────────────────────────┐
                         │ E3 · Your numbers       │
                         └────────────┬────────────┘
                                       │
                     watch continuously for either:
                                       │
              ┌────────────────────────┴───────────────────────┐
     72h with no question_answered              free_questions_remaining ≤ 10
     (free_questions_remaining > 10)             OR 21 days since onboarding
              │                                              │
              ▼                                              │
   ┌────────────────────────┐                                │
   │ E4 · Inactivity win-back │                               │
   └────────────┬─────────────┘                               │
                │                                             │
     question_answered fires →                                │
     cancel this send, keep watching                          │
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                         ┌────────────────────────┐
                         │ E5 · Conversion         │
                         └────────────┬────────────┘
                                       │
                                       ▼
                        sequence ends — no further
                        automated send either way

Checked before every send, at every node:
stop on subscription_started, unsubscribed, or account_deleted.
```

If a fast activator hits `free_questions_remaining ≤ 10` while the win-back
watch (E4) is also armed, conversion (E5) wins — don't spend a win-back nudge
pulling someone back into a nearly-exhausted free tier when the real next
email is the price.

## Events this depends on

| Event | Exists today | Where |
|---|---|---|
| `onboarding_completed` | Implicit — no explicit event, but `final-flow.html`'s "done" panel and session creation mark it | `src/lib/session.ts`, `internal/doc/final-flow.html` |
| `question_answered` | Yes | `src/lib/analytics.ts` |
| `quiz_completed` (first occurrence of 10 answered in one sitting) | **Not tracked yet** | needs adding — see below |
| `free_questions_remaining` | Derivable (`FREE_PREVIEW`/50 minus answered count) | `src/lib/gate.ts`, `src/lib/content.ts` (`SITE.freeQuestions`) |
| `subscription_started` / `unsubscribed` / `account_deleted` | Handled by the ESP and billing provider, not this repo | — |

**Before this can run as designed, add a `quiz_completed` event** next to
`questionAnswered` in `analytics.ts`, fired once per completed 10-question
set. Until it exists, the activation nudge (E2) and the retention hand-off
(E3) have to fall back to a cruder proxy — `questions_answered_count >= 1` —
which fires on the first answered question rather than the first finished
quiz. Swap it out the day the real event ships; nothing else in the sequence
changes.

## Send-time policy

- **Re-evaluate on a schedule**, not once at enrollment — a cron-style journey
  check (hourly is enough) that asks "who is 24h past onboarding with
  `quiz_completed` still 0" or "who has gone 72h with no `question_answered`",
  rather than a fire-and-forget delayed send. A pure delay can't cancel itself
  when the condition it was watching for changes underneath it.
- **Local morning** for anything after E1. E1 sends immediately regardless of
  local time, since it's the direct continuation of onboarding.
- **Idempotency**: key each send on `(user_id, template_id)` and dedupe, so a
  retried journey-runner job or a re-evaluated cohort can't double-send. E4
  additionally dedupes on `(user_id, template_id, 14-day window)` since it can
  legitimately re-arm after someone goes quiet again.
- **Global suppression** is a send-time check, not an enrollment-time one — an
  account that upgrades between enrollment and the scheduled send must not
  get the email anyway.

## Merge fields (Liquid)

Fallbacks are inside the templates (`| default:`), so a missing field never
prints blank. Onboarding collects no name, so nothing here uses one.

| Field | Source | Fallback |
|---|---|---|
| `exam` | onboarding step 1 | NCLEX-RN |
| `test_date` | onboarding step 2 | Not set yet |
| `daily_target` | onboarding step 3 | 25 |
| `benchmark_correct` | benchmark, 0 to 3 | row shows "Skipped" |
| `questions_answered` | attempts | 0 |
| `free_remaining` | 50 minus answered | 50 |
| `weakest_topic`, `weakest_topic_pct` | attempts, by category | "Not enough answers yet" |
| `app_url` | config | https://app.nursia.io |
| `unsubscribe_url`, `preferences_url`, `postal_address` | ESP | none, required |

Links carry `utm_source=lifecycle&utm_medium=email&utm_campaign=onboarding&utm_content=e1` to `e5`. Email 3 links to `/dashboard` and `/settings`, and email 5 links to `/upgrade`. Confirm those paths exist in the app, or point them at the app root.

## Before sending

1. **Ship `quiz_completed`.** See above — the whole point of this being
   event-driven instead of day-based depends on it existing.
2. **Host the logo.** `assets/nursia-logo.png` is referenced relatively so the
   files open locally. Find and replace `assets/nursia-logo.png` with the
   hosted URL. It is the teal-tile wordmark from
   `brand-kit/logos/nursia-logo-teal.svg`.
3. **Fill `postal_address`.** CAN-SPAM requires a physical address in
   commercial email.
4. **Check the claims against the product.** Email 5 states $29 a month, a
   14-day refund, one-button cancel and pause up to three months. These come
   from `pricing/page.tsx` and `PRICING_FAQ` in `src/lib/content.ts`. If any
   of those change, change the email.
5. **The question bank size.** Emails say "every question in the bank" and
   never a total, because `README.md` says the 1,200 figure is the intended
   bank rather than what is in the repo. Add a number only once it is
   counted.
6. **Email 2 and 4 use SE-011 and PH-212 verbatim** from `src/lib/content.ts`.
   They should stay in the free set, so a reader can open the same question
   in the app.

## Rendering notes

Table layout, inline styles, 600px, stacks below 620px. Web fonts (Bricolage
Grotesque, Source Serif 4, IBM Plex Mono) load in Apple Mail and iOS. Gmail
and Outlook fall back to Arial, Georgia and Courier New. Locked to a light
color scheme. The highlighter is used once per email, on the headline, and
never next to the teal button.
