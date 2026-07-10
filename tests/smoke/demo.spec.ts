import { test, expect } from "@playwright/test"

// Interactive checks against demo mode (?demo=1) — in-memory sample data,
// never touches Supabase (see CLAUDE.md database safety rules). Safe to run
// against the production URL. See docs/RELIABILITY_PLAN.md workstream D.

test.beforeEach(async ({ page }) => {
  await page.goto("/?demo=1")
  await page.evaluate(() => localStorage.setItem("gang-of-wine-username", "SmokeTest"))
  await page.reload()
})

test("vote tab renders book cards with covers", async ({ page }) => {
  await page.getByText("Vote", { exact: true }).click()
  await expect(page.getByText("Remarkably Bright Creatures")).toBeVisible()
  await expect(page.locator("img").first()).toBeVisible()
})

test("tapping vote changes the vote count", async ({ page }) => {
  await page.getByText("Vote", { exact: true }).click()
  const card = page.locator('[data-slot="card"]', { hasText: "Remarkably Bright Creatures" })
  const voteButton = card.getByRole("button", { name: /^Voted?$/ })
  const before = await voteButton.textContent()
  await voteButton.click()
  await expect(voteButton).not.toHaveText(before ?? "")
})

test("suggest-a-book form opens and searches Open Library", async ({ page }) => {
  await page.getByText("Vote", { exact: true }).click()
  await page.getByRole("button", { name: "Suggest a Book" }).click()
  await page.getByPlaceholder("Enter book title").fill("Yesteryear")
  await page.getByPlaceholder("Enter author name").fill("Caro Claire Burke")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByText("Pick the correct book").or(page.getByText("No matches found"))).toBeVisible({
    timeout: 15_000,
  })
})

test("schedule tab renders meeting card and RSVP buttons respond", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const card = page.locator('[data-slot="card"]', { hasText: "Tomorrow, and Tomorrow, and Tomorrow" })
  await expect(card).toBeVisible()
  await card.getByRole("button", { name: "Yes", exact: true }).click()
  await expect(card.getByText("SmokeTest")).toBeVisible()
})
