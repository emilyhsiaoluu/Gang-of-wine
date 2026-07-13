# Gang of Wine Moms Book Club — Claude Instructions

## Working with the owner

The owner is **not an engineer** — she's a non-technical founder/product person. That means:

- **Be her CTO partner, not just a code executor.** Proactively flag technical debt, bad patterns, and UX problems she might not have thought to ask about. If you spot something worth fixing while doing another task, mention it.
- **Explain tradeoffs in plain English**, not jargon. Skip acronyms unless you define them.
- **Propose before implementing** on anything non-trivial. A quick "here's what I'd do and why" is better than silently going a direction she didn't expect.
- **Push back on requests that would make the UX worse.** She'd rather hear "that would create a dead end, here's a better approach" than get exactly what she asked for if it's suboptimal.

## What this app is

A mobile-first book club app for a small group of friends ("Gang of Wine Moms"). Members can suggest books, vote on what to read next, RSVP to meetings, and browse past picks. It's a real production app used by real people — changes land in production via Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Supabase** (Postgres) — env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **shadcn/ui** + **Tailwind CSS** — `components/ui/` holds all primitives
- **lucide-react** for icons
- **Open Library API** (no key needed) — currently used for search, covers, descriptions, subjects, ratings
  - Search: `https://openlibrary.org/search.json?title=X&author=Y&limit=N`
  - Works (full description): `https://openlibrary.org/works/KEY.json`
  - Covers: `https://covers.openlibrary.org/b/id/ID-[S/M/L].jpg`
  - We tried Google Books but it rate-limits (429) in production without an API key. Open Library works but has gaps (thin descriptions, noisy subjects). **We're open to switching to a better free book API** — just validate it doesn't require a paid key or rate-limit at low traffic before proposing it.

## Key files

| File | Purpose |
|------|---------|
| `components/book-club-app.tsx` | Root client component; all state + Supabase calls live here |
| `components/tabs/vote-tab.tsx` | Suggest + vote on books; fetches OL card data per suggestion |
| `components/tabs/schedule-tab.tsx` | Next meeting RSVP + share card |
| `components/tabs/archive-tab.tsx` | Past meetings archive |
| `components/book-detail-dialog.tsx` | Popup with full description (fetched from OL Works endpoint) |
| `components/book-cover.tsx` | Cover image with fallback gradient |
| `lib/types.ts` | Shared TypeScript types |
| `lib/supabase.ts` | Supabase client singleton |
| `lib/data.ts` | Seed data (used when Supabase is unavailable) |

## Git + deploy workflow

**Branch:** develop on the session's assigned `claude/*` branch. (Historically
everything had to go through `claude/supabase-database-name-gg9h06` because the
Preview env vars in Vercel were pinned to that one branch; the pin was removed
on 2026-07-13, so any branch gets a working preview now.)

**Every session:**
1. After squash-merging a PR to main, the branch diverges. Fix with:
   ```bash
   git fetch origin main
   git reset --hard origin/main
   git cherry-pick <latest-commit-sha>
   git push --force-with-lease origin <branch-name>
   ```
2. Open a draft PR, wait for Vercel to show **Ready**, then merge with squash.
3. **Always paste the preview URL in chat after every push — every single time,
   even if you just shared it.** Vercel derives it from the branch name:
   `https://gang-of-wine-git-<branch-slug>-emilyhsiaoluu-5596s-projects.vercel.app`
   (the exact URL appears in the Vercel bot comment on the PR).

**Why:** The owner's friends use prod. Test on the preview URL, never dogfood on prod.

## Database safety (learned from the 2026-07-10 outage)

Preview deployments use a **separate staging Supabase project** (verified
2026-07-13 via the preview bundle + health check), so previews cannot touch
production data. Two hard rules still apply:

1. **Code before data.** If a feature changes what the data can look like
   (new column, nullable field, new "kind" of row), the code that understands
   the new shape must be merged to production BEFORE any new-shape data is
   created. Old prod code + new-shape data = prod crashes for everyone.
2. **Test with demo mode, not real data.** `?demo=1` runs the app on
   in-memory sample data and never touches Supabase. Use it for all UI
   testing — and tell the owner to use it too when asking her to try things.

## Environment variables (learned from the second 2026-07-10 outage)

`NEXT_PUBLIC_*` vars are baked into the JS bundle **at build time**. Deleting
one in Vercel doesn't break the running deployment — it breaks the NEXT
deploy, silently. That's exactly how prod went down for ~15 hours on Jul 9–10:
the Supabase vars vanished during staging setup, and the next merge shipped a
bundle with no database credentials.

Inventory (names + scopes only — values live in Vercel, never in the repo):

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Prod database URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview (all branches) | **Staging** database URL — a separate Supabase project from prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Prod public anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview (all branches) | Staging public anon key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Production + Preview | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Production + Preview | Analytics |
| `NEXT_PUBLIC_TABLE_PREFIX` | Preview (all branches) (`gow_`) | Staging table prefix — must NEVER be set on Production |

The three Preview-scoped vars were originally pinned to the branch
`claude/supabase-database-name-gg9h06`, which made preview builds on every
other branch fail the `check-env.mjs` guard. The owner removed the branch
pins on 2026-07-13 so all preview branches build.

Hard rules:

1. **Never delete a Vercel env var.** Edit or add; deletion is how outage #2
   happened. Any env change gets noted in the PR/chat.
2. **After any env change or merge to main:** redeploy, then
   `curl https://gang-of-wine.vercel.app/api/health` and confirm 200 before
   ending the session.
3. New env vars get added to this table and to `.env.example` (name only).

See `docs/RELIABILITY_PLAN.md` for the monitoring/alerting/evals work order.

## Design + UX rules

The owner wants Claude to be a co-designer, not just a code executor. Before implementing any UI change:

- **Dogfood every UI change before presenting it.** Render the app at iPhone width (375px), actually tap through the changed flow (buttons, forms, toggles — including submitting), and look at the result visually. Catch broken buttons, cramped tap targets, and visual oddities before the owner does. Never declare a UI change done from code alone.
- **Mobile-first always.** Assume an iPhone SE width (375px). Tap targets ≥ 44px.
- **Call out UX gaps proactively.** If a request would create a confusing flow, tiny tap target, missing empty state, or broken edge case — say so and suggest the better version before writing code.
- **Consistency matters.** All three tabs (Vote, Schedule, Archive) should feel like the same app. If a pattern exists on one tab, apply it to the others.
- **Don't leave dead ends.** Every card/item needs a clear action. Empty states should explain what to do next.
- **Prefer showing over hiding.** Surfacing key info inline (description snippet, genre chips, rating) is better than burying it one tap deeper.

## Common patterns

**Tap targets:** Tapping cover, title, author, or description on any card opens `BookDetailDialog`.

**Cover URL upscaling:**
```ts
function getHighResCoverUrl(url: string): string {
  if (url.includes("books.google.com")) {
    return url.replace(/&edge=curl/, "").replace(/zoom=\d+/, "zoom=5")
  }
  return url.replace(/-[SM]\.jpg$/, "-L.jpg")
}
```

**Card data fetching (vote tab):** `fetchCardData(title, author)` hits OL search + Works endpoint and returns `{ description, subjects, rating }`. Results are cached in component state keyed by book ID, with a `useRef<Set<string>>` to prevent duplicate fetches.

**Null checks:** OL data arrives asynchronously. Always use `!= null` (loose) not `!== null` (strict) when checking optional fields — `undefined !== null` is `true` in JS and will crash renders.

**Date formatting:** Dates stored as `YYYY-MM-DD`; always parse with `new Date(\`${dateStr}T00:00:00\`)` to avoid timezone shifts.

## Tone

The app is warm and fun — "wine moms book club" energy. Copy should be friendly, not corporate. The serif font (`font-serif`) is used for titles and headings to feel literary. Emojis are fine in UI copy (📚🍷) but not in code comments.
