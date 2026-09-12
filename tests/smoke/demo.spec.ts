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
  // Any of the three is a pass. Open Library is a third party and goes down
  // (it did on 2026-09-11); CI going red for their outage teaches everyone to
  // ignore CI. What matters is that the form always reaches a usable state.
  await expect(
    page
      .getByText("Pick the correct book")
      .or(page.getByText("No matches found"))
      .or(page.getByText("Open Library is probably down")),
  ).toBeVisible({ timeout: 15_000 })
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
  await page.getByRole("button", { name: "Schedule a meeting" }).click()
  await expect(page.getByText("Schedule a Meeting")).toBeVisible()
  // Poll mode by default, and no book handed over from Vote.
  await expect(page.getByRole("button", { name: "Start Date Poll" })).toBeVisible()
  await expect(page.getByPlaceholder("Enter book title")).toHaveValue("")
})

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
  await expect(poll.getByRole("button", { name: `Remove ${UNVOTED_OPTION.label}` })).toBeVisible()
  await expect(poll.getByRole("button", { name: `Remove ${VOTED_OPTION.label}` })).toHaveCount(0)
})

test("a book Open Library can't find can still be added by hand", async ({ page }) => {
  // Stub a successful search that finds nothing, so this tests the zero-results
  // path deterministically instead of depending on what Open Library happens to
  // hold (or whether it is up at all) today.
  await page.route("**://openlibrary.org/search.json**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ docs: [] }) }),
  )

  await page.getByText("Vote", { exact: true }).click()
  await page.getByRole("button", { name: "Suggest a Book" }).click()
  await page.getByPlaceholder("Enter book title").fill("Swan Song: Diana, My Sister")
  await page.getByPlaceholder("Enter author name").fill("Charles Spencer")
  await page.getByRole("button", { name: "Search" }).click()
  await page.getByText("No matches found").waitFor({ timeout: 20_000 })

  await page.getByRole("button", { name: "Enter it by hand instead" }).click()
  await page.getByPlaceholder("Optional — why this one?").fill("Out soon, picked it early.")
  await page.getByRole("button", { name: "Add Suggestion" }).click()

  const card = page.locator('[data-slot="card"]', { hasText: "Swan Song" })
  await expect(card).toBeVisible()
  await expect(card.getByText("Added by hand")).toBeVisible()
  await expect(card.getByText("Out soon, picked it early.")).toBeVisible()
})

test("a book can still be added by hand when Open Library is unreachable", async ({ page }) => {
  // Emily hit this for real on 2026-09-11 while openlibrary.org was down: the
  // manual-add button was gated on the search SUCCEEDING with zero results, so
  // an outage left a red error box and no way forward -- the same dead end the
  // feature was built to remove.
  await page.route("**://openlibrary.org/**", (route) => route.abort())

  await page.getByText("Vote", { exact: true }).click()
  await page.getByRole("button", { name: "Suggest a Book" }).click()
  await page.getByPlaceholder("Enter book title").fill("Swan Song: Diana, My Sister")
  await page.getByPlaceholder("Enter author name").fill("Charles Spencer")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page.getByText("Open Library is probably down")).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: "Enter it by hand instead" }).click()
  await page.getByPlaceholder("Optional — why this one?").fill("Added during an outage.")
  await page.getByRole("button", { name: "Add Suggestion" }).click()

  const card = page.locator('[data-slot="card"]', { hasText: "Swan Song" })
  await expect(card).toBeVisible()
  await expect(card.getByText("Added by hand")).toBeVisible()
})

// Emily, 2026-09-11: "the box is at the top, but the button is at the bottom,
// so i have to scroll up to see it." A form that opens off-screen reads as a
// button that did nothing. These assert the form is actually within the
// viewport after each of the ways it can be opened.
async function formIsOnScreen(page: import("@playwright/test").Page) {
  return page.getByText("Schedule a Meeting").evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.top >= 0 && r.top < window.innerHeight
  })
}

test("the meeting form opens in view when started from the button", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  await page.getByRole("button", { name: "Schedule a meeting" }).click()
  await expect(page.getByText("Schedule a Meeting")).toBeVisible()
  await page.waitForTimeout(700) // smooth scroll
  expect(await formIsOnScreen(page)).toBe(true)
})

test("the meeting form opens in view when editing a meeting from the top of the list", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const card = page.locator('[data-slot="card"]', { hasText: "Tomorrow, and Tomorrow, and Tomorrow" })
  await card.getByRole("button", { name: /Emily's House/ }).click()
  await expect(page.getByText("Edit Meeting")).toBeVisible()
  await page.waitForTimeout(700)
  const onScreen = await page.getByText("Edit Meeting").evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.top >= 0 && r.top < window.innerHeight
  })
  expect(onScreen).toBe(true)
})

test("the RSVP tab still leads with the meeting, not the schedule button", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  const card = page.locator('[data-slot="card"]').first()
  const button = page.getByRole("button", { name: "Schedule a meeting" })
  const cardTop = (await card.boundingBox())?.y ?? 0
  const buttonTop = (await button.boundingBox())?.y ?? 0
  // The thing ten people open the app to do comes first.
  expect(buttonTop).toBeGreaterThan(cardTop)
})

test("the manual-entry panel carries its own Add button, in view", async ({ page }) => {
  // Emily reported "add it by hand doesn't work" (2026-09-11). The button only
  // opened a panel whose commit button sat below the fold, so tapping it looked
  // like nothing happened. The panel now owns the primary action.
  await page.route("**://openlibrary.org/search.json**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ docs: [] }) }),
  )
  await page.getByText("Vote", { exact: true }).click()
  await page.getByRole("button", { name: "Suggest a Book" }).click()
  await page.getByPlaceholder("Enter book title").fill("A Book With No Record")
  await page.getByPlaceholder("Enter author name").fill("Nobody At All")
  await page.getByRole("button", { name: "Search" }).click()
  // Wait for the empty-result state to render before reaching for the button
  // inside it -- clicking straight through is flaky, since the button does not
  // exist until React has re-rendered with the results.
  await expect(page.getByText("No matches found")).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: "Enter it by hand instead" }).click()

  // Exactly one Add Suggestion on screen, and it is inside the panel, in view.
  const add = page.getByRole("button", { name: "Add Suggestion" })
  await expect(add).toHaveCount(1)
  await page.waitForTimeout(700) // smooth scroll
  await expect(add).toBeInViewport()
  // exact:true matters -- Playwright matches accessible names by substring by
  // default, and "Never mind, let me search again" contains "search".
  await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCount(0)

  await add.click()
  await expect(page.locator('[data-slot="card"]', { hasText: "A Book With No Record" })).toBeVisible()
})

test("the schedule form says it does not search", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  await page.getByRole("button", { name: "Schedule a meeting" }).click()
  await expect(page.getByText("this doesn't search")).toBeVisible()
})

test("a disabled Start Date Poll says what is still missing", async ({ page }) => {
  // Emily filled in book, author and dates, never guessed Location was
  // required, and concluded the book "wasn't locked in" (2026-09-11).
  await page.getByRole("tab", { name: "RSVP" }).click()
  await page.getByRole("button", { name: "Schedule a meeting" }).click()

  const submit = page.getByRole("button", { name: "Start Date Poll" })
  await page.getByPlaceholder("Enter book title").fill("Swan Song: Diana, My Sister")
  await page.getByPlaceholder("Enter author name").fill("Charles Spencer")
  const dates = page.locator('input[type="date"]')
  await dates.nth(0).fill(demoDate(20).iso)
  await dates.nth(1).fill(demoDate(21).iso)

  // Exactly where she got stuck: it must now name the one thing left.
  await expect(submit).toBeDisabled()
  await expect(page.getByText("Still needed: a location.")).toBeVisible()

  await page.getByPlaceholder("e.g., Emily's House").fill("Emily's House")
  await expect(page.getByText(/Still needed/)).toHaveCount(0)
  await expect(submit).toBeEnabled()
})

test("the missing-fields line stays quiet on an untouched form", async ({ page }) => {
  await page.getByRole("tab", { name: "RSVP" }).click()
  await page.getByRole("button", { name: "Schedule a meeting" }).click()
  await expect(page.getByText(/Still needed/)).toHaveCount(0)
})
