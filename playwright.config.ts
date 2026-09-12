import { defineConfig, devices } from "@playwright/test"

// Daily smoke/UX-lint suite (see docs/RELIABILITY_PLAN.md, workstream D).
// Runs against production by default — prod checks are read-only; the
// interactive checks use ?demo=1, which never touches Supabase.
// Defaults to LOCALHOST on purpose. This used to default to production, which
// meant a bare `pnpm exec playwright test` silently drove the live app, and
// then reported that local changes "failed" when it had never looked at them
// (2026-09-11: a long detour chasing a button that was present locally the
// whole time). Targeting production is now something you ask for:
//   pnpm test:local   -> localhost, what you run while building
//   pnpm test:smoke   -> production, what the nightly workflow runs
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 375, height: 667 }, // iPhone SE width, per CLAUDE.md
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
