// Production snapshot. Run this before ANY SQL against production --
// Supabase's free tier has no point-in-time recovery, so this file is the only
// undo that exists for the group's votes, RSVPs and suggestions.
//
//   pnpm backup
//
// Writes backups/<timestamp>.json. That directory is gitignored on purpose:
// the data contains real people's names.
//
// Reads with the public anon key, exactly like the app does -- so it captures
// what the app can see. If row-level security ever hides rows from the anon
// key, this snapshot would be incomplete; the row counts printed at the end
// are there so a suspicious drop is visible.
import { createClient } from "@supabase/supabase-js"
import { mkdir, writeFile } from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"

const TABLES = ["suggestions", "votes", "meetings", "meeting_rsvps"]

// Load .env.local by hand (no dotenv dependency -- see the anti-bloat rules).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  }
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const prefix = process.env.NEXT_PUBLIC_TABLE_PREFIX ?? ""

if (!url || !key) {
  console.error("Missing Supabase credentials.")
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY, or put them in .env.local.")
  console.error("For a PRODUCTION backup use the Production-scoped values from Vercel.")
  process.exit(1)
}

console.log(`Backing up ${url} (table prefix: ${prefix || "none"})`)

const supabase = createClient(url, key)
const snapshot = { takenAt: new Date().toISOString(), supabaseUrl: url, tablePrefix: prefix, tables: {} }

for (const name of TABLES) {
  const { data, error } = await supabase.from(`${prefix}${name}`).select("*")
  if (error) {
    console.error(`\nBackup aborted: could not read "${prefix}${name}" -- ${error.message}`)
    console.error("An incomplete backup is worse than none, because it looks like a backup.")
    process.exit(1)
  }
  snapshot.tables[name] = data
  console.log(`  ${name}: ${data.length} rows`)
}

await mkdir("backups", { recursive: true })
const file = `backups/${snapshot.takenAt.replace(/[:.]/g, "-")}.json`
await writeFile(file, JSON.stringify(snapshot, null, 2))

const total = Object.values(snapshot.tables).reduce((n, rows) => n + rows.length, 0)
console.log(`\nSaved ${total} rows to ${file}`)
if (total === 0) {
  console.warn("WARNING: zero rows captured. Check you pointed at the right project before trusting this.")
}
