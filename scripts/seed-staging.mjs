// Seeds the STAGING database from a production snapshot, so previews have
// realistic data to test against instead of an empty shell. An empty staging
// hides exactly the bugs worth catching: a poll with ten voters, a long name
// that wraps, a book with no cover, a meeting with a null date.
//
//   pnpm backup                                  # snapshot production first
//   STAGING_SUPABASE_URL=... \
//   STAGING_SUPABASE_ANON_KEY=... \
//   pnpm seed-staging                            # newest snapshot -> staging
//
// SEED ONCE, DON'T SYNC. A copy that refreshes on a schedule is a second
// system to maintain and a second thing that can point the wrong way. Re-run
// this by hand when staging has drifted far enough to stop being useful.
//
// THE DIRECTION IS THE WHOLE POINT: data flows production -> staging and never
// back. Three guards below enforce that, because a restore script that can
// write to production is a loaded gun pointed at the only copy of the club's
// votes and RSVPs.
import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "node:fs"

// Guard 1: the production project, by name. This script refuses to write here.
const PRODUCTION_REF = "zesmmtrzazmrctrthvlk"

// Guard 2: the target is read from STAGING_-prefixed variables only. The usual
// NEXT_PUBLIC_/SUPABASE_ names are deliberately NOT accepted -- those are the
// ones lying around pointing at production, and a typo should fail loudly
// rather than quietly find prod credentials in the environment.
const url = process.env.STAGING_SUPABASE_URL
const key = process.env.STAGING_SUPABASE_ANON_KEY
const prefix = process.env.STAGING_TABLE_PREFIX ?? "gow_"

const die = (...lines) => {
  for (const l of lines) console.error(l)
  process.exit(1)
}

if (!url || !key) {
  die(
    "Set STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY.",
    "Take them from Vercel -> Settings -> Environment Variables, PREVIEW scope.",
    "Do not use the Production ones -- this script refuses them anyway.",
  )
}

if (url.includes(PRODUCTION_REF)) {
  die(
    "",
    "REFUSED: that is the production database.",
    "This script only ever writes to staging. Production is the source, never the target.",
    "",
  )
}

// argv may hold flags in any order, so pick the first non-flag as the snapshot.
const snapshotArg = process.argv.slice(2).find((a) => !a.startsWith("--"))
const file =
  snapshotArg ??
  (() => {
    const files = readdirSync("backups").filter((f) => f.endsWith(".json")).sort()
    if (files.length === 0) die("No snapshot in backups/. Run `pnpm backup` first.")
    return `backups/${files[files.length - 1]}`
  })()

const snapshot = JSON.parse(readFileSync(file, "utf8"))

if (snapshot.supabaseUrl?.includes(PRODUCTION_REF) === false) {
  console.warn(`Note: snapshot came from ${snapshot.supabaseUrl}, not production.`)
}

console.log(`Snapshot: ${file} (taken ${snapshot.takenAt})`)
console.log(`Target:   ${url} (table prefix: ${prefix || "none"})`)

const supabase = createClient(url, key)
const t = (name) => `${prefix}${name}`

// Parents before children: votes reference a suggestion, RSVPs reference a
// meeting. Ids are carried over as-is so those links survive the copy.
const ORDER = ["suggestions", "meetings", "votes", "meeting_rsvps"]

// Guard 3: never seed on top of existing rows. Re-running would duplicate
// every suggestion and double every vote count. --replace clears the target
// first; it is safe to have here only because the production guard above has
// already run, and it deletes by explicit id rather than issuing a bare
// delete (see the data-safety rules in CLAUDE.md).
const replace = process.argv.includes("--replace")
for (const name of ORDER) {
  const { data, error } = await supabase.from(t(name)).select("*")
  if (error) {
    die(
      `Could not read "${t(name)}" on the target: ${error.message}`,
      "Has sql/staging_setup.sql been run on this project yet?",
    )
  }
  if (data.length === 0) continue
  if (!replace) {
    die(
      `REFUSED: "${t(name)}" already has ${data.length} row(s).`,
      "Seeding on top would duplicate everything.",
      "Pass --replace to clear the target first (staging only -- production is refused above).",
    )
  }
}

if (replace) {
  // Children before parents, the reverse of the insert order.
  for (const name of [...ORDER].reverse()) {
    const { data } = await supabase.from(t(name)).select("*")
    if (!data?.length) continue
    for (const row of data) {
      let q = supabase.from(t(name)).delete()
      // Every delete carries an explicit filter on this row's own key.
      if (row.id != null) q = q.eq("id", row.id)
      else if (row.suggestion_id != null) q = q.eq("suggestion_id", row.suggestion_id).eq("voter_name", row.voter_name)
      else if (row.meeting_id != null) q = q.eq("meeting_id", row.meeting_id).eq("rsvp_name", row.rsvp_name)
      else continue
      const { error } = await q
      if (error) die(`Could not clear "${t(name)}": ${error.message}`)
    }
    console.log(`  ${name}: cleared ${data.length} existing row(s)`)
  }
}

// The two databases' schemas drift -- staging had suggestion_id before
// production did; production has updated_at columns staging lacks. Rather than
// failing on the first mismatch, drop the columns the target doesn't have and
// say which, so a copy still gets you usable data.
async function insertTolerant(name, rows) {
  let payload = rows
  const dropped = new Set()
  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase.from(t(name)).insert(payload)
    if (!error) return dropped
    const missing = error.message.match(/'([^']+)' column/)?.[1]
    if (!missing) return { error }
    dropped.add(missing)
    payload = payload.map((r) => {
      const { [missing]: _drop, ...rest } = r
      return rest
    })
  }
  return { error: { message: "too many missing columns; schemas have drifted too far" } }
}

let total = 0
for (const name of ORDER) {
  const rows = snapshot.tables[name] ?? []
  if (rows.length === 0) {
    console.log(`  ${name}: nothing to copy`)
    continue
  }
  const result = await insertTolerant(name, rows)
  if (result.error) {
    die(
      `\nFailed inserting into "${t(name)}": ${result.error.message}`,
      `Stopped after ${total} row(s); the target is half-seeded, so re-run with --replace.`,
    )
  }
  const note = result.size > 0 ? ` (dropped column(s) the target lacks: ${[...result].join(", ")})` : ""
  total += rows.length
  console.log(`  ${name}: ${rows.length} rows copied${note}`)
}

console.log(`\nSeeded ${total} rows into staging.`)
console.log("Check the preview's /api/health, then tap through it.")
