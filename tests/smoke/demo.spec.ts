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

// --- Feature coverage: the three requests from 2026-09-11 (docs/BACKLOG.md) ---

test("a date poll can be started from the RSVP tab without voting on a book", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  await page.getByRole("button", { name: "Plan a meeting" }).click()
  await expect(page.getByText("Schedule a Meeting")).toBeVisible()
  // Poll mode by default, and no book handed over from Vote.
  await expect(page.getByRole("button", { name: "Start Date Poll" })).toBeVisible()
  await expect(page.getByPlaceholder("Enter book title")).toHaveValue("")
})

test("a date can be added to an already-open poll without losing votes", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const poll = page.locator('[data-slot="card"]', { hasText: "The Midnight Library" })
  await poll.getByRole("button", { name: "Add a date" }).click()
  await poll.getByLabel("New date to add to the poll").fill("2026-10-11")
  await poll.getByRole("button", { name: "Add", exact: true }).click()
  await expect(poll.getByText("Sun, Oct 11")).toBeVisible()
  // The votes that were already cast are still there.
  await expect(poll.getByText("Sarah, Jess")).toBeVisible()
})

test("only a date nobody has voted for can be removed", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const poll = page.locator('[data-slot="card"]', { hasText: "The Midnight Library" })
  await expect(poll.getByRole("button", { name: /^Remove Sun, Oct 4/ })).toBeVisible()
  await expect(poll.getByRole("button", { name: /^Remove Sun, Sep 27/ })).toHaveCount(0)
})

test("a book Open Library can't find can still be added by hand", async ({ page }) => {
  await page.getByText("Vote", { exact: true }).click()
  await page.getByRole("button", { name: "Suggest a Book" }).click()
  await page.getByPlaceholder("Enter book title").fill("Swan Song: Diana, My Sister")
  await page.getByPlaceholder("Enter author name").fill("Charles Spencer")
  await page.getByRole("button", { name: "Search" }).click()
  await page.getByText("No matches found").waitFor({ timeout: 20_000 })

  await page.getByRole("button", { name: "Add it by hand" }).click()
  await page.getByPlaceholder("Optional — why this one?").fill("Out soon, picked it early.")
  await page.getByRole("button", { name: "Add Suggestion" }).click()

  const card = page.locator('[data-slot="card"]', { hasText: "Swan Song" })
  await expect(card).toBeVisible()
  await expect(card.getByText("Added by hand")).toBeVisible()
  await expect(card.getByText("Out soon, picked it early.")).toBeVisible()
})
