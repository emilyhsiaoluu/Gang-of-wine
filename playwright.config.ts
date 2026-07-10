import { defineConfig, devices } from "@playwright/test"

// Daily smoke/UX-lint suite (see docs/RELIABILITY_PLAN.md, workstream D).
// Runs against production by default — prod checks are read-only; the
// interactive checks use ?demo=1, which never touches Supabase.
const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://gang-of-wine.vercel.app"

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
