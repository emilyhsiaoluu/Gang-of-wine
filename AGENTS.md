# Gang of Wine Moms Book Club — agent instructions

**`CLAUDE.md` is the operating contract. Read it in full before your first tool
call, whichever agent you are.** This file is a pointer, not a summary — don't
work from the orientation below alone, and don't add rules here. Cross-agent
rules go in `CLAUDE.md`.

## Quick orientation

- **Real production app**, used by ~10 people on their phones. `main` deploys to
  Vercel automatically.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, shadcn/ui
  + Tailwind v4, lucide-react, PostHog, Playwright.
- **Branch:** `claude/<short-description>` off latest `main`. Never commit to `main`.
- **Dogfood in demo mode** — `http://localhost:3000/?demo=1` — never on production.
- **Before saying anything is done:** run the Ship Gate in `CLAUDE.md`
  (`pnpm typecheck`, `pnpm build`, `pnpm test:local`, tap through it yourself in
  a browser at 375px, report what you did *not* verify).

## The three things that matter most

1. Don't break production. 2. Don't lose data. 3. Don't add bloat.

Feature requests go in `docs/BACKLOG.md` before any code. Design rules are in
`DESIGN.md`. Past incidents are in `docs/RELIABILITY_PLAN.md`.
