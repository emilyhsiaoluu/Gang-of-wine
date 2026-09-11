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

const snapshotArg = process.argv[2]
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
// every suggestion and double every vote count.
for (const name of ORDER) {
  const { count, error } = await supabase.from(t(name)).select("*", { count: "exact", head: true })
  if (error) {
    die(
      `Could not read "${t(name)}" on the target: ${error.message}`,
      "Has sql/staging_setup.sql been run on this project yet?",
    )
  }
  if (count > 0 && !process.argv.includes("--force")) {
    die(
      `REFUSED: "${t(name)}" already has ${count} row(s).`,
      "Seeding on top would duplicate everything. Empty the tables first,",
      "or pass --force if you know the target is disposable.",
    )
  }
}

let total = 0
for (const name of ORDER) {
  const rows = snapshot.tables[name] ?? []
  if (rows.length === 0) {
    console.log(`  ${name}: nothing to copy`)
    continue
  }
  const { error } = await supabase.from(t(name)).insert(rows)
  if (error) {
    die(
      `\nFailed inserting into "${t(name)}": ${error.message}`,
      "If it names a missing column, the staging schema is behind production --",
      "run the files in sql/ against the staging project and try again.",
      `Stopped after ${total} row(s); the target is now half-seeded, so empty it before retrying.`,
    )
  }
  total += rows.length
  console.log(`  ${name}: ${rows.length} rows copied`)
}

console.log(`\nSeeded ${total} rows into staging.`)
console.log("Check the preview's /api/health, then tap through it.")
