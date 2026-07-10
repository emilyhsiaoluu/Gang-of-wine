import { test, expect } from "@playwright/test"

// Automated checks for CLAUDE.md's design rules ("Tap targets >= 44px",
// "Mobile-first always") at iPhone SE width. Catches "bad", not "broken" —
// see docs/RELIABILITY_PLAN.md workstream D. Runs against demo mode so it
// never touches Supabase.

const TABS = ["RSVP", "Vote", "Archive"] as const
const MIN_TAP_TARGET_PX = 44

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

  test(`${tab} tab: interactive elements meet the 44px tap-target minimum`, async ({ page }) => {
    await page.getByRole("tab", { name: tab }).click()

    const undersized = await page.evaluate((min) => {
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      return candidates
        .filter((el) => {
          const style = window.getComputedStyle(el)
          if (style.display === "none" || style.visibility === "hidden") return false
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) return false // not rendered
          return rect.width < min || rect.height < min
        })
        .map((el) => {
          const rect = el.getBoundingClientRect()
          const label = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || "(no label)"
          return `${label}: ${Math.round(rect.width)}x${Math.round(rect.height)}`
        })
    }, MIN_TAP_TARGET_PX)

    expect(undersized, `undersized tap targets on ${tab}: ${JSON.stringify(undersized)}`).toEqual([])
  })
}
