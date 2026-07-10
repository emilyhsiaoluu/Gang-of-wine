import { test, expect } from "@playwright/test"

// Layout-breakage check at iPhone SE width (375px): no tab should scroll
// sideways. Catches genuine responsive bugs — see docs/RELIABILITY_PLAN.md
// workstream D. Runs against demo mode so it never touches Supabase.
//
// NOTE: a tap-target-size (>=44px) check was intentionally left out — the
// owner reviewed the current tap targets, is satisfied with them, and does
// not want a daily red build over a deliberate design choice. Revisit if
// tap-target polish becomes a priority.

const TABS = ["RSVP", "Vote", "Archive"] as const

test.beforeEach(async ({ page }) => {
  await page.goto("/?demo=1")
  await page.evaluate(() => localStorage.setItem("gang-of-wine-username", "SmokeTest"))
  await page.reload()
})

for (const tab of TABS) {
  test(`${tab} tab: no horizontal overflow at 375px`, async ({ page }) => {
    await page.getByRole("tab", { name: tab }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${tab} tab overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
  })
}
