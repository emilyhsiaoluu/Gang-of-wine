# Backlog

Every feature request lands here first — before any code. This is the whole
process for staying thoughtful about what gets added.

**How to add one:** copy the block below, fill it in, keep it short. The
*Problem* line is the important one: write the problem, not the solution Emily
proposed. Solutions change; problems don't.

```
### <short name>
- **Asked by:** who, when
- **Problem:** the thing that is actually hard today
- **Already exists?** what the code already does toward this (grep before you guess)
- **Smallest version:** the recommendation
- **Size:** S / M / L
- **Status:** Proposed / Agreed / Building / Shipped / Dropped
```

Sizes: **S** = one file, no DB change. **M** = several files or a new surface,
no DB change. **L** = changes the shape of the data — goes through the migration
protocol in `CLAUDE.md`.

---

## Now

### 1. Start a date poll without voting on a book first
- **Asked by:** Emily, 2026-09-11
- **Problem:** The group usually picks the book off-platform — iMessage or in
  person. The hard part is finding a date that works for 10+ women. iMessage
  polls get buried in the thread. So the app's flow (suggest → vote → schedule)
  forces a step the group has already done elsewhere, and the one thing they
  need — a date poll — is stuck behind it.
- **Already exists?** **Yes, almost all of it.** `schedule-tab.tsx` already has a
  full "Schedule a Meeting" form with a **"Poll for dates"** mode, free-text book
  title and author, and 2–4 candidate dates. `DatePoll` renders it, voting and
  "Lock it in" work. **The only thing missing is a way to open that form.**
  `showForm` (schedule-tab.tsx:53) is only ever set true by the edit path or by a
  prefill handed over from the Vote tab — so today the *sole* entry point is the
  Vote tab, and the empty state literally reads *"Head to Vote to schedule the
  next meeting."*
- **Smallest version:** Add a "Plan a meeting" / "Start a date poll" button on
  the RSVP tab that opens the existing form with nothing prefilled, and rewrite
  the empty state to offer it. No new machinery, no database change.
  Open question for Emily: should the book title be optional, so a poll can be
  started with the date first and the book filled in later?
- **Size:** S
- **Status:** **Shipped 2026-09-11.** "Plan a meeting" now appears on the RSVP
  tab (and in its empty state), opening the existing form with nothing
  prefilled and already switched to **Poll for dates** -- the reason people
  come to that tab. Book title stays required: the group *does* know the book,
  they just don't want to vote on it.

### 2. Add an extra date after a poll is already open
- **Asked by:** Emily, 2026-09-11
- **Problem:** Once a poll is out, the first few dates often don't work for
  anyone, and there's no way to offer another one without starting over — which
  would throw away everyone's votes.
- **Already exists?** Partly. Options live in a `date_options` JSON column and
  `toggleDateVote` already rewrites that whole array, so **adding an option needs
  no database change.** But the date-options editor is gated behind
  `!editingMeetingId` (schedule-tab.tsx:272), so editing a meeting can't touch
  them. Also capped at 4 options (schedule-tab.tsx:299).
- **Smallest version:** An "Add a date" row on the open poll itself, visible to
  anyone, appending one option with zero voters. Existing votes untouched.
  Probably raise the cap from 4 to ~6 at the same time — with 10+ people, four
  candidate dates is thin. Needs a rule for what happens to a date nobody picks
  (suggestion: let whoever added it remove it while it has no votes).
- **Size:** S-M
- **Status:** **Shipped 2026-09-11.** "+ Add a date" row on any open poll;
  the new date appears immediately with zero voters and nobody's existing
  availability moves. Duplicate dates are refused (both in the UI and in
  `lib/data.ts`, since two people can add the same night at once). Cap raised
  4 -> 6, shared as `MAX_DATE_OPTIONS` so the create form and the live poll
  can't drift. A date with **zero** votes can be removed by anyone; once
  someone votes for it the control disappears, because removing it would
  delete their answer -- enforced in `removeDateOption`, not just hidden.

### 3. Add a book the API can't find
- **Asked by:** Emily, 2026-09-11
- **Problem:** The group's next pick is *Swan Song: Diana, My Sister* by Charles
  Spencer, which isn't published yet, so Open Library has no record of it.
  Unreleased and self-published books are exactly the ones a book club picks
  early — this will keep happening.
- **Already exists?** No, and worse: it's a **dead end**, which breaks
  `DESIGN.md` rule 4. In `vote-tab.tsx`, `handleConfirmAdd` returns immediately
  unless `selectedBook` is set (line ~189), and `selectedBook` can only come
  from an Open Library search result. When the search finds nothing the app
  says *"No matches found. Double-check the spelling, or try fewer words"*
  (line ~312) and offers no way forward. Emily's title is spelled correctly and
  there is nothing to find. **Reproduced in the browser 2026-09-11** at 375px
  with her actual book: the search returns nothing and the "Add Suggestion"
  button below it is disabled and greyed out, with no explanation of why.
- **Smallest version:** the "No matches found" box gets a button —
  **"Add it manually"** — that turns the title and author she already typed into
  a suggestion, no search required. Nothing else changes. See the UX note below.
- **Size:** S. No database change: `suggestions` already stores title, author,
  description and `cover_url` as plain values, and `cover_url` is already
  nullable with a gradient fallback in `book-cover.tsx`.
- **Status:** **Shipped 2026-09-11**, as specced below.

#### Two bugs the dogfooding caught that the assertions did not

Both were found by *looking at the screenshots*, which is why the Ship Gate
requires it:

1. The escape-hatch button originally read `Add "<title>" anyway`. With a real
   title it rendered as `Add "Swan Song: Diana, My Siste...` -- truncated past
   the point of meaning. Now it reads **"Add it by hand"**, and the title is
   echoed back in the confirmation panel where it can wrap.
2. The confirmation copy rendered as **"Charles Spencerby hand"** -- JSX drops
   the whitespace around a newline, so the space had to be explicit.

A third came out of reading the flow: a hand-added book's description showed on
the card and then vanished in the detail popup, which said "No description
available" -- the popup only ever asked Open Library, the one place that by
definition has nothing for these books. `BookDetailDialog` now takes a
`fallbackDescription`.

#### UX notes for #3 (2026-09-11)

Three design calls, with a recommendation on each.

**Where the escape hatch lives.** Put it *only* in the empty-search state, not
as a second button next to "Search". A visible "add manually" option next to
search invites people to skip the search, and then the club ends up with three
spellings of the same book and no covers. Let the app try first, and offer the
manual path at the exact moment it fails — that's also the moment the user has
already typed the title and author, so nothing has to be retyped. (The button
was going to name the book, but a real title truncates at 375px -- see the bugs
above -- so it reads **"Add it by hand"** and the confirmation panel echoes the
title back.)

**What a manual book looks like on the card.** It has no cover and no
description. `BookCover` already draws a nice title/author gradient when
`coverUrl` is missing, so it won't look broken — but it will look *different*,
and someone will assume it failed. Add one quiet line under the author:
*"Added by hand — no cover yet."* That turns an apparent bug into an obvious
state. Optionally let anyone paste a cover image URL later, but that's a
separate, smaller-value feature; don't bundle it.

**Whether to offer a description field.** Recommend **yes, one optional
textarea**, because for an unreleased book nobody can look it up either — a
sentence of "here's why I picked this" is the only context the group will get.
Keep it optional and short (a placeholder like *"Optional — why this one?"*),
and keep it to one field. Every extra field on that form is a reason to abandon
it on a phone.

**What not to build:** an ISBN lookup, a cover uploader, or a second book API as
part of this. Each one is a bigger project than the problem, and the problem is
"Emily can't add one specific book tonight."

---

## Found while reading the code (not requested)

### Hydration error on load
- **Found:** 2026-09-11, in the local dev console on every page load.
- **Problem:** React renders different HTML on the server than in the browser —
  almost certainly the username read from `localStorage`. Today it's invisible;
  this class of bug shows up later as content flashing or a blank screen.
- **Size:** S
- **Status:** Proposed — worth fixing before it's blamed on a feature.

### Staging was down — RESOLVED 2026-09-11
- **Symptom:** the preview's `/api/health` returned `"ok": false` with `fetch
  failed` on all four tables while every env var was present, and
  `mfsurihnjrslnghlasvt.supabase.co` would not resolve in DNS.
- **First call was wrong.** Diagnosed as deleted, on the reasoning that a
  paused free-tier project still resolves. It doesn't — **a paused Supabase
  project stops resolving, which looks identical to a deleted one from
  outside.** The dashboard is the only place that distinguishes them; check it
  before concluding anything is gone.
- **Actual cause:** the project ("Emily's Apps", shared with her other apps —
  hence the `gow_` table prefix) had auto-paused after ~7 days idle.
- **Fix:** Resume project in the dashboard. Data intact, no new project, no env
  var changes, ~3 minutes. Preview `/api/health` green again.
- **Then seeded it from production** with `pnpm seed-staging --replace` — all
  50 rows. It had held 2 rows, which is the "empty staging hides the bugs worth
  catching" case exactly.
- **Left over:** it will pause again after ~7 days idle. Not worth automating
  around; just recognise the symptom. Upgrading that org to Pro would stop it,
  which is a money question for Emily, not a technical one.
- **Status:** Shipped 2026-09-11

### The `suggestion_id` migration never ran on production
- **Found:** 2026-09-11, in the first-ever production backup — the `meetings`
  table has no `suggestion_id` column, though `sql/2026-07-suggestion-link.sql`
  has been sitting in the repo since July.
- **What it costs:** nothing crashes — `addMeeting` catches the error and
  retries without the field. But the feature it powers is silently dead:
  deleting a meeting is supposed to return its book, votes intact, to the Vote
  tab, and today it just doesn't. A feature that quietly does nothing is worse
  than one that's missing, because nobody reports it.
- **Fix:** run `sql/2026-07-suggestion-link.sql` in the Supabase SQL editor.
  It's additive and idempotent, and the code that understands the column has
  been live for two months, so the code-before-data rule is already satisfied.
  Run `pnpm backup` first anyway — that's the protocol.
- **Size:** S (Emily, 2 min in the dashboard)
- **Status:** Proposed

### `.env.local` points at a dead Supabase project
- **Found:** 2026-09-11. The hostname in `.env.local` no longer resolves, so
  local dev against real data shows the error banner. Demo mode is unaffected.
- **Fix:** Emily copies the **Preview**-scoped Supabase values out of Vercel.
  See "Local setup" in `CLAUDE.md`.
- **Size:** S (Emily, 5 min)
- **Status:** Proposed

### No CI on pull requests
- **Found:** 2026-09-11. `smoke.yml` ran on a daily 6:23am cron only — nothing
  checked a pull request, so a broken build or a failing test could be merged
  and found the next morning, in production.
- **Fix:** `.github/workflows/pr.yml` — typecheck, build, and demo smoke on
  every PR.
- **Size:** S
- **Status:** Shipped 2026-09-11

### No way to back up production data
- **Found:** 2026-09-11. Supabase's free tier has no point-in-time recovery. A
  bad `delete` or a bad migration was unrecoverable.
- **Fix:** `pnpm backup` writes a timestamped JSON snapshot of all four tables
  to `backups/` (gitignored).
- **Size:** S
- **Status:** Shipped 2026-09-11

---

## Later

*Nothing yet. Requests that aren't worth doing now go here with one line on
why, so they stop getting re-raised.*

## Dropped

*Requests decided against, with the reason. Keeping them here is what stops
them coming back.*
