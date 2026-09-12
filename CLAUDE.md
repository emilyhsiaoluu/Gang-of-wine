# Gang of Wine Moms Book Club — the operating contract

Read this whole file before your first tool call. It is not background reading;
it is the process you are required to follow. `DESIGN.md` is the visual system,
`docs/BACKLOG.md` is the feature queue, `docs/RELIABILITY_PLAN.md` is history.

---

## The three promises

Ten real women use this app on their phones. Every change you make is a change
to something they are already using. Everything below exists to keep three
promises:

1. **Don't break production.** A broken deploy is not "a bug we'll fix" — it is
   ten people who can't RSVP tonight.
2. **Don't lose data.** There are no backups on Supabase's free tier and no
   undo on a bad `delete`. Votes, RSVPs and suggestions are irreplaceable.
3. **Don't add bloat.** Every feature you add is a feature that must keep
   working forever. The best outcome for a feature request is often a smaller
   change than the one requested, or none at all.

If a request conflicts with one of these, say so before you build it.

---

## Who you're working with

Emily is a product person, not an engineer. She can read plain English and make
good calls; she cannot read a stack trace. That means:

- **Be her engineering partner, not a code executor.** Have opinions. Say which
  option you'd pick and why. "Both work, up to you" is a failure.
- **Plain English, no jargon** unless you define it in the same sentence.
- **Short.** She has explicitly asked for shorter answers. Give the decision,
  not the survey. If she asks for shorter, the next version is actually
  shorter — don't move the cut material into a notes section.
- **Never make her the first tester.** You dogfood it. She approves it.
- **Never ask her to do something you can do.** Only stop at things that need
  her login, her card, or her judgment.

### The required shape for any non-trivial request

Before you write code for anything bigger than a typo fix, answer in exactly
this shape — four lines, no preamble:

```
What you asked for:  <her request, in your words, so she can catch a misread>
What it actually costs: <the real complexity, the thing that could break>
What I'd do instead: <your recommendation — often smaller>
Size: S / M / L
```

- **S** — one file, no database change, no new dependency.
- **M** — several files or a new screen/surface, still no database change.
- **L** — changes the *shape* of the data (new column, new kind of row, a field
  that used to be required becoming optional).

**Every L goes through the migration protocol below. No exceptions.**

Then stop and wait for her yes. For an S you may proceed after stating it.

---

## The Loop — how a feature request gets built

Run these five steps in order, every time. Say which step you're on.

1. **Understand the real problem.** Write down the problem, not the solution she
   proposed. ("Finding a date that works for 10 women is hard" is the problem;
   "add a poll button" is one solution to it.)
2. **Check whether it already exists.** Grep first. This app has features with
   no entry point — machinery that works but has no button. Half of the backlog
   is plumbing, not building. Report what you found before proposing anything.
3. **Propose the smallest version** using the four-line shape above. Log it in
   `docs/BACKLOG.md`.
4. **Build it** on a `claude/*` branch, behind the design rules in `DESIGN.md`.
5. **Prove it** — the Ship Gate below. You do not get to say "done" without
   passing it and showing the evidence.

---

## The Ship Gate — required before you say a change is ready

Run all five. Paste the results. "It should work" is not a result.

```bash
pnpm typecheck     # 1. TypeScript is clean
pnpm build         # 2. It actually builds
pnpm test:local    # 3. Smoke + UX lint pass against your local build
```

4. **Dogfood it yourself, in a browser, at 375px.** Not optional, not
   "verified from the code." Concretely:

   - Start the app: `preview_start` with name `gang-of-wine`, then
     `resize_window` to the `mobile` preset (375x812).
   - Go to `http://localhost:3000/?demo=1` — demo mode is in-memory sample
     data and never touches any database, so you can click anything.
   - **Tap through the flow you changed, end to end, including submitting.**
     Then tap through the *other two tabs* to make sure you didn't break them.
   - `read_console_messages` with `onlyErrors` — a clean console is part of
     passing.
   - Take a screenshot of the changed screen and put it in front of Emily with
     `SendUserFile`. She is a visual approver; a description is not a
     screenshot.

**Two traps that cost real time on 2026-09-11:**

- **`pnpm test:local` is the one to run, not a bare `pnpm exec playwright
  test`.** The config's base URL used to default to production, so an ad-hoc
  run silently drove the live app and then reported that local changes
  "failed" when it had never looked at them. The default is localhost now, but
  know which target you are on before believing a red result.
- **Don't run `pnpm build` while the dev server is up.** It overwrites `.next`
  underneath the running server, which then serves a mix of old and new. If
  the browser is showing markup that isn't in the source, that's why: stop the
  server, `rm -rf .next`, start it again.
- And when a scripted edit says it patched a file, **assert the anchor
  matched** — a replace that silently no-ops (an em dash where you typed a
  hyphen) looks exactly like a passing edit and sends you hunting a bug that
  was never there.

5. **Report honestly.** What you changed, what you verified, and **what you did
   not verify.** If you couldn't test something (a real-data path, a share
   sheet, an iOS-only behavior), say that out loud rather than letting silence
   imply it's covered.

After merging to main, one more: `curl https://gang-of-wine.vercel.app/api/health`
and confirm `"ok": true` before you end the session.

---

## Data safety — the rules that keep votes and RSVPs alive

The 2026-07-10 outage is written up in `docs/RELIABILITY_PLAN.md`. These are the
rules that came out of it plus the ones that protect the data itself.

**Hard rules. Breaking one is an incident, not a style choice.**

1. **Never write a Supabase `.delete()` or `.update()` without a filter.**
   `supabase.from(table("votes")).delete()` with no `.eq()` clears the table.
   Every destructive call must have an `.eq()` on the same line you write it.
2. **Migrations are additive only.** Add columns. Never `drop column`, never
   rename a column, never change a column's type. To retire a field: stop
   writing it and leave it sitting there. Renaming is how old deploys start
   reading columns that no longer exist.
3. **Every migration is idempotent** — `add column if not exists` — and lives in
   `sql/YYYY-MM-description.sql` so it's replayable.
4. **Back up before any SQL against production:** `pnpm backup`. It writes a
   timestamped JSON snapshot of all four tables to `backups/` (gitignored — it
   contains real names). This is the only undo that exists.
   Needs the production credentials, which live in Vercel's Production scope:
   `SUPABASE_URL=... SUPABASE_ANON_KEY=... pnpm backup`.
5. **Code before data.** If a change alters what the data can look like, the
   code that *understands* the new shape must be live in production BEFORE any
   new-shape row is created. Old prod code + new-shape data = everyone's app
   crashes.
6. **Destructive actions in the UI need an undo or a confirm** — see `DESIGN.md`.
   Never both, never neither.

### Migration protocol (every L-sized change)

1. `pnpm backup` — snapshot production.
2. Write the SQL file, additive and idempotent.
3. Ship the *code* that tolerates both shapes (old rows missing the new field),
   merge it, confirm `/api/health` is green.
4. *Then* run the SQL in the Supabase dashboard.
5. Confirm `/api/health` green again and tap through the affected flow.

---

## Seeding staging from production

Once a staging project exists, give it real data — an empty staging hides the
bugs worth catching (a poll with ten voters, a long name that wraps, a book
with no cover, a meeting with a null date).

```bash
SUPABASE_URL=<prod> SUPABASE_ANON_KEY=<prod> pnpm backup
STAGING_SUPABASE_URL=<staging> STAGING_SUPABASE_ANON_KEY=<staging> pnpm seed-staging
```

**Seed once; do not build a sync.** A scheduled copy is a second system to
maintain and a second thing that can one day point the wrong way. Re-run it by
hand when staging has drifted far enough to stop being useful.

`seed-staging.mjs` refuses to write to the production project by name, refuses
to read credentials from the ordinary `SUPABASE_*`/`NEXT_PUBLIC_*` variables
(the ones lying around pointing at prod), and refuses to seed on top of
existing rows. **Data flows production → staging and never back.**

⚠️ The snapshot holds real people's names. `backups/` is gitignored — keep it
that way, and don't paste snapshot contents into a PR, an issue, or a chat.

---

## Handing a change to Emily to try

Your dogfooding is not her dogfooding. Yours proves it isn't broken; hers
decides whether it's right. After the Ship Gate passes, give her all four of
these — every time, unprompted:

1. **The preview link, scannable.** She tests on her phone, and a Vercel
   preview URL is ~80 characters. Generate a QR code for it and send it with
   `SendUserFile`, plus the raw link as a fallback. Don't make her type it.
2. **Which environment it is, in one line.** Preview = the staging database,
   seeded from a production snapshot. She will see her real friends' names and
   real books; say out loud that anything she taps there cannot reach the live
   app, or she'll test timidly and find nothing.
3. **A numbered tap-list, one per change**, each with what *good* looks like.
   Not "try the new poll feature" — the exact taps, and the exact thing to see.
   Three to five steps each, maximum.
4. **What to do with a bug: tell you, don't merge.** And say plainly what you
   already verified, so she spends her attention on judgment calls — is the
   copy right, is the button in the right place — rather than re-checking
   whether it functions.

Only after she says yes: merge, then `curl .../api/health`, then tap through
the same list once on production.

---

## If production breaks — Emily's 60-second fix

Tell her this, don't make her find it:

1. Go to **vercel.com** → the **Gang-of-wine** project → **Deployments**.
2. Find the last deployment from before the break (they're newest-first).
3. Click the **⋯** menu on it → **Promote to Production**.
4. The app is back in about 30 seconds. Nothing is lost — it just runs the
   older code.

Then tell her what broke and fix it properly on a branch.

---

## Anti-bloat rules

- **No new dependency without asking first.** Every package is a thing that can
  break at 11pm. `components/ui/` already has almost everything.
- **No new top-level tab.** Three tabs (RSVP, Vote, Archive) is the whole app.
  A fourth is a redesign, not a feature.
- **When you add, look for something to delete.** Dead code, a duplicated
  pattern, a stale doc.
- **Prefer surfacing existing machinery over building new machinery.** See step
  2 of the Loop.
- **Don't write a doc when a comment will do.** This repo has enough markdown.

---

## What this app is

A mobile-first book club app for a group of friends. Members suggest books, vote
on the next read, poll for a date that works, RSVP, and browse past picks. Real
production app, real users, deployed on Vercel from `main`.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Supabase** (Postgres) — client in `lib/supabase.ts`, all queries in `lib/data.ts`
- **shadcn/ui** + **Tailwind v4** — primitives in `components/ui/`
- **lucide-react** icons · **PostHog** analytics · **Playwright** smoke tests
- **Open Library API** (no key) — search, covers, descriptions, subjects, ratings
  - Search: `https://openlibrary.org/search.json?title=X&author=Y&limit=N`
  - Work detail: `https://openlibrary.org/works/KEY.json`
  - Covers: `https://covers.openlibrary.org/b/id/ID-[S/M/L].jpg`
  - Google Books was tried and rate-limits (429) in production without a key.
    Open Library is thin in places. A better free API is welcome — verify it
    needs no paid key and doesn't rate-limit at low traffic before proposing.

## Key files

| File | Purpose |
|------|---------|
| `components/book-club-app.tsx` | Root client component; all state + data calls |
| `components/tabs/schedule-tab.tsx` | Meeting card, RSVP, the create/edit meeting form, date poll host |
| `components/tabs/vote-tab.tsx` | Suggest + vote on books; fetches Open Library card data |
| `components/tabs/archive-tab.tsx` | Past meetings |
| `components/date-poll.tsx` | The availability poll UI on a meeting card |
| `components/book-detail-dialog.tsx` | Full-description popup |
| `components/card-action-bar.tsx` | The shared row of card actions |
| `lib/data.ts` | **Every** Supabase read/write + the demo-mode mirror of each |
| `lib/demo-data.ts` | Sample data behind `?demo=1` |
| `lib/table.ts` | Table-name prefixing (staging vs production) |
| `lib/types.ts` | Shared types |
| `scripts/backup.mjs` | Production snapshot → `backups/` |
| `scripts/data-lint.mjs` | Nightly data-integrity check |

**Important:** if you add a data operation to `lib/data.ts`, you must add its
demo-mode branch in the same function. A function that skips the demo branch
will hit the real database during testing. That is how data gets lost.

## Local setup

`pnpm install`, then `pnpm dev` and open `http://localhost:3000/?demo=1`.

⚠️ **Known issue (found 2026-09-11):** `.env.local` points at a Supabase project
(`vfvwldamyfztzwerijqk`) that no longer exists — its hostname doesn't resolve.
(It is a *third* project, separate from prod and from the dead staging one.)
So local dev against *real* data shows the error banner. **Demo mode works fine
and is the correct way to dogfood anyway.** To fix real-data local dev, Emily
copies the **Preview**-scoped `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_TABLE_PREFIX` values from
Vercel → Settings → Environment Variables into `.env.local` (staging, not
production).

⚠️ **Google Drive artifacts:** this repo lives in Google Drive, which scatters
files literally named `Icon\r` everywhere. They break `git fetch` and the
Turbopack dev cache. `pnpm dev` cleans them automatically (`predev`); if git
itself breaks with `bad object refs/Icon?`, run:
`find .git -name 'Icon?' -delete`

## Git + deploy workflow

- **Branch:** `claude/<short-description>` off the latest `main`. Never commit
  to `main`.
- Open a PR. CI runs typecheck + build + demo smoke on every PR — wait for it.
- Wait for the Vercel preview to say **Ready**, then **paste the preview URL in
  chat. Every push, every time**, even if you just shared it. It's in the Vercel
  bot's PR comment.
- Squash-merge. Then `curl .../api/health` and confirm `"ok": true`.
- After a squash merge your branch has diverged; start the next one fresh from
  `git fetch origin && git checkout -b claude/<next> origin/main`.

**Never dogfood on production.** Preview is meant to use a separate staging
database; demo mode uses no database at all.

⚠️ **Staging pauses itself, and a paused project looks deleted.** Supabase's
free tier pauses a project after ~7 days idle, and a paused project **stops
resolving in DNS** — so the symptom is `curl` failing to resolve the host and
the preview's `/api/health` returning `"ok": false` on all four tables with
every env var present. That reads exactly like a deleted project. It is not.
**Check the Supabase dashboard before concluding anything is gone** (2026-09-11:
diagnosed as deleted, was paused; one click restored it, data intact).

The staging project is **"Emily's Apps" (`mfsurihnjrslnghlasvt`)**, shared with
her other apps, which is why Gang of Wine's tables are prefixed `gow_`. If it
has paused again: dashboard → the project → **Resume project**, wait a few
minutes, then re-check the preview's `/api/health`. Right after a restore,
PostgREST's schema cache can briefly report `PGRST205 could not find the
table` — wait and retry rather than concluding the schema is missing.

## Environment variables

`NEXT_PUBLIC_*` vars are baked into the JS bundle **at build time**. Deleting one
in Vercel doesn't break the running site — it breaks the *next* deploy, silently.
That is exactly how production went down for ~15 hours on Jul 9–10.

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Production database |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview (all branches) | **Staging** database — separate project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Production anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview (all branches) | Staging anon key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Production + Preview | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Production + Preview | Analytics |
| `NEXT_PUBLIC_TABLE_PREFIX` | Preview only (`gow_`) | Staging table prefix — **never** set on Production |

1. **Never delete a Vercel env var.** Edit or add.
2. After any env change: redeploy, then check `/api/health` before walking away.
3. A new env var goes in this table and in `.env.example` (name only, never a value).

## Code patterns worth knowing

**Null checks.** Open Library data arrives async. Use `!= null` (loose), not
`!== null` — `undefined !== null` is `true` and will crash a render.

**Dates.** Stored as `YYYY-MM-DD`. Always parse as
`new Date(\`${dateStr}T00:00:00\`)` or the date shifts by a day in Pacific time.
A meeting with no date yet (an open poll) stores `null` — every date code path
must tolerate that.

**Cover upscaling.**
```ts
function getHighResCoverUrl(url: string): string {
  if (url.includes("books.google.com")) {
    return url.replace(/&edge=curl/, "").replace(/zoom=\d+/, "zoom=5")
  }
  return url.replace(/-[SM]\.jpg$/, "-L.jpg")
}
```

**Card data fetching (vote tab).** `fetchCardData(title, author)` hits Open
Library search + the Works endpoint. Cached in component state by book id, with
a `useRef<Set<string>>` guard against duplicate fetches.

## Tone

Warm and fun — wine-night-with-your-smartest-friends. Friendly copy, never
corporate. Serif (`font-serif`) for titles. Emoji are welcome in UI copy (📚🍷)
and never in code comments.
