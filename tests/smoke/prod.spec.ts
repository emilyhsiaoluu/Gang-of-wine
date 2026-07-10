import { test, expect } from "@playwright/test"

// Read-only checks against the real production app and data — no taps, no
// writes. See docs/RELIABILITY_PLAN.md workstream D.

test("home page loads without the Supabase error banner", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Could not load book club data")).not.toBeVisible()
  // Either the welcome screen (new visitor) or the app shell (returning
  // visitor, name in localStorage) is an acceptable loaded state. The header
  // title is hidden below the sm: breakpoint, so use the always-visible tab
  // label instead of it for the app-shell case.
  await expect(
    page.getByText("Welcome to Gang of Wine Moms Book Club").or(page.getByText("RSVP", { exact: true })),
  ).toBeVisible()
})

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health")
  const body = await res.json()
  expect(body.ok, `health check failed: ${JSON.stringify(body)}`).toBe(true)
})
