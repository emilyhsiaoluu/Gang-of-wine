import { test, expect } from "@playwright/test"

// Interactive checks against demo mode (?demo=1) — in-memory sample data,
// never touches Supabase (see CLAUDE.md database safety rules). Safe to run
// against the production URL. See docs/RELIABILITY_PLAN.md workstream D.


// Demo dates are relative to today (lib/demo-data.ts isoDate), so a hard-coded
// label like "Sun, Oct 4" is a time bomb that goes red on some future Tuesday.
// Derive them the same way the app does.
function demoDate(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const iso = d.toISOString().slice(0, 10)
  const label = new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  return { iso, label }
}
// The poll's three seeded options: +16 and +17 have voters, +23 has none.
const VOTED_OPTION = demoDate(16)
const UNVOTED_OPTION = demoDate(23)
const NEW_OPTION = demoDate(30)

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

// --- Add a date to a poll that is already running (docs/BACKLOG.md item 2) ---

test("a date can be added to an already-open poll without losing votes", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const poll = page.locator('[data-slot="card"]', { hasText: "The Midnight Library" })
  await poll.getByRole("button", { name: "Add a date" }).click()
  await poll.getByLabel("New date to add to the poll").fill(NEW_OPTION.iso)
  await poll.getByRole("button", { name: "Add", exact: true }).click()
  await expect(poll.getByText(NEW_OPTION.label)).toBeVisible()
  // The votes that were already cast are still there.
  await expect(poll.getByText("Sarah, Jess")).toBeVisible()
})

test("the same date cannot be added to a poll twice", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const poll = page.locator('[data-slot="card"]', { hasText: "The Midnight Library" })
  await poll.getByRole("button", { name: "Add a date" }).click()
  await poll.getByLabel("New date to add to the poll").fill(VOTED_OPTION.iso)
  await expect(poll.getByText("That date is already on the poll.")).toBeVisible()
  await expect(poll.getByRole("button", { name: "Add", exact: true })).toBeDisabled()
})

test("only a date nobody has voted for can be removed", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const poll = page.locator('[data-slot="card"]', { hasText: "The Midnight Library" })
  // Removing a date someone picked would delete their answer, so the control
  // is absent -- and removeDateOption refuses it too, not just the UI.
  await expect(poll.getByRole("button", { name: `Remove ${UNVOTED_OPTION.label}` })).toBeVisible()
  await expect(poll.getByRole("button", { name: `Remove ${VOTED_OPTION.label}` })).toHaveCount(0)
})
