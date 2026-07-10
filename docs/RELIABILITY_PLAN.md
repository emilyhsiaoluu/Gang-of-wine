# Reliability Plan — monitoring, alerts, dashboard, evals

**Status:** Approved by owner 2026-07-10. This doc is the work order for the
implementing Claude session. Work through the workstreams in order; each has
acceptance criteria. Read CLAUDE.md first (branch workflow, database safety
rules, dogfooding rules).

---

## Incident recap (what this plan is responding to)

**Outage #2 — the env-var outage (Jul 9–10, 2026)**

Timeline (all times PT):

- **Jul 9, ~9:45–11:15pm** — Staging environment setup happened alongside
  PRs #25–#27. Sometime in this window, `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` disappeared from Vercel's environment
  variables entirely (all scopes). Root cause of the deletion unconfirmed —
  owner should check Vercel's Activity log while it's still recent.
- **Jul 9, 10:40pm and 11:13pm** — PRs #26 and #27 merged to main, each
  triggering a production build. `NEXT_PUBLIC_*` vars are baked into the
  JS bundle **at build time**, so the first rebuild after the deletion
  shipped a bundle with no database credentials. Deleting the var didn't
  break the then-running deployment — it armed a time bomb that the next
  deploy detonated.
- **Jul 9 ~10:40pm → Jul 10 afternoon** — Production showed every visitor
  "Could not load book club data from Supabase: Missing Supabase env vars."
  The brand-new `/api/health` endpoint (shipped in PR #26!) was returning
  503 the whole time. Nothing was listening to it.
- **Jul 10** — Owner discovered the outage by opening the app herself.
  Fixed by re-adding both env vars (Production scope) and redeploying.
  Verified: `/api/health` → 200, bundle points at the correct prod Supabase
  project (`zesmmtrzazmrctrthvlk`).

**Total: ~14–16 hours of downtime, detected by a human, by accident.**

Why-chain:

1. Prod broke → bundle built without Supabase keys.
2. Keys were missing → deleted from Vercel during staging setup.
3. The build succeeded anyway → nothing treats missing keys as a build error.
4. It stayed broken ~15h → nothing pings `/api/health`; the in-app error
   banner is a handled state that emits no telemetry.
5. A human found it manually → no alerting exists.

Each workstream below closes one link in that chain.

---

## Workstream A — Build-time guard (code, do first, ~30 min)

Never ship a bundle that can't reach the database.

- Add `scripts/check-env.mjs`: exits 1 with a clear message if
  `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is unset.
- Wire it as `"prebuild"` in package.json so `next build` can't run
  without them — locally, on preview, and on prod builds alike.
- Local dev note: developers need `.env.local` (see `.env.example`) or the
  build fails — that's the point. Do NOT add a skip flag.

**Accept when:** a Vercel build with a missing var fails in <30s with a
message that names the missing var, instead of deploying a broken bundle.

## Workstream B — Uptime monitoring + real alerts (owner task, ~10 min)

- Owner creates a free UptimeRobot account.
- Monitor: HTTPS, `https://gang-of-wine.vercel.app/api/health`,
  5-minute interval, keyword check for `"ok":true`.
- Alert contacts: email + UptimeRobot mobile app push notifications.
  (SMS is paid; push is free and just as fast.)
- Optional: enable the free public status page for uptime history.

**Accept when:** owner receives a test alert on her phone.

## Workstream C — Health endpoint v2 + failure telemetry (code, ~1 hr)

- Upgrade `/api/health` to check all four tables (via the `table()` prefix
  helper), and report per-table ok/fail, total latency ms, and the deployed
  commit (`VERCEL_GIT_COMMIT_SHA`) so we can tell WHICH deploy broke things.
- In `book-club-app.tsx` `loadData` catch block: capture a PostHog event
  `data_load_failed` with the error detail. Today the app knows it's broken
  and tells no one; this makes user-facing failures show up in analytics
  even between health-check pings.

**Accept when:** `/api/health` returns per-table status + commit sha, and a
simulated load failure produces a `data_load_failed` event in PostHog.

## Workstream D — Daily smoke tests / evals (code, ~2 hrs)

GitHub Actions workflow `.github/workflows/smoke.yml`:

- Cron daily at an off-minute (e.g. `23 13 * * *` UTC ≈ 6:23am PT) plus
  `workflow_dispatch` for manual runs.
- Playwright (Chromium) against **production**, read-only:
  - `/` loads, welcome screen or app shell renders
  - `/api/health` returns 200 with `"ok":true`
- Playwright against **demo mode** (`/?demo=1`), interactive — demo mode is
  in-memory and never touches Supabase (see CLAUDE.md database safety):
  - Vote tab renders book cards with covers
  - Tapping vote increments the count
  - Suggest-a-book form opens and searches Open Library
  - Schedule tab renders meeting card; RSVP buttons respond
- A failed workflow emails the repo owner automatically via GitHub
  notifications — zero extra alerting infra. (Owner: confirm GitHub
  notification emails are on for workflow failures.)

Nightly data lint (same workflow or a second job): a small script using the
Supabase anon key (from repo secrets — it's the public key, low risk) that
checks invariants and exits 1 on violation:

- every suggestion has a non-empty title and author
- every meeting date parses (guards the null-date crash class)
- every vote references an existing suggestion

**Accept when:** the workflow runs green on main, and deliberately breaking
an assertion produces a failure email.

## Workstream E — Daily health dashboard (owner task w/ recipe, ~20 min)

PostHog → New dashboard, name it **“GoW Daily Health”**, tiles:

1. Daily active users (unique persons, last 14 days)
2. `tab_viewed` broken down by tab (last 7 days) — what's actually used
3. Trend: `book_suggested`, `book_vote_toggled`, `rsvp_submitted` (7 days)
4. `data_load_failed` + `$exception` count (7 days) — should be zero;
   any bar here = investigate
5. Link tile to Session Replay filtered to sessions with errors

Morning routine: UptimeRobot app says up/down; PostHog dashboard says
who's using what and whether anything failed quietly.

**Accept when:** dashboard exists and workstream C's events flow into it.

---

## Rules going forward (also see CLAUDE.md)

- **Env vars are load-bearing.** Never delete a Vercel env var — edit or
  add. Any env change: note it in the PR/chat, redeploy, then curl
  `/api/health` and confirm 200 before walking away.
- Env var inventory lives in CLAUDE.md (names + scopes only, never values).
- After ANY merge to main, verify `/api/health` returns 200 before ending
  the session.
