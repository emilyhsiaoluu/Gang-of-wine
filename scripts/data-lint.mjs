// Nightly data-integrity check (see docs/RELIABILITY_PLAN.md workstream D).
// Uses the public anon key against production — read-only, low risk (RLS
// governs what it can see). Exits 1 with a description on any violation so
// the GitHub Actions failure email carries a useful message.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (set as repo secrets).")
  process.exit(1)
}

const supabase = createClient(url, key)
const problems = []

function isParsableDate(dateStr) {
  if (!dateStr) return true // "" is valid: an unscheduled / date-poll meeting
  if (dateStr.includes("-")) {
    const [y, m, d] = dateStr.split("-").map(Number)
    return Boolean(y && m && d)
  }
  return !Number.isNaN(new Date(dateStr).getTime())
}

const { data: suggestions, error: suggestionsError } = await supabase.from("suggestions").select("id,title,author")
if (suggestionsError) problems.push(`could not read suggestions: ${suggestionsError.message}`)
else {
  for (const s of suggestions) {
    if (!s.title?.trim() || !s.author?.trim()) {
      problems.push(`suggestion ${s.id} has an empty title or author`)
    }
  }
}

const { data: meetings, error: meetingsError } = await supabase.from("meetings").select("id,date")
if (meetingsError) problems.push(`could not read meetings: ${meetingsError.message}`)
else {
  for (const m of meetings) {
    if (!isParsableDate(m.date)) {
      problems.push(`meeting ${m.id} has an unparseable date: "${m.date}"`)
    }
  }
}

const { data: votes, error: votesError } = await supabase.from("votes").select("suggestion_id")
if (votesError) problems.push(`could not read votes: ${votesError.message}`)
else if (suggestions) {
  const suggestionIds = new Set(suggestions.map((s) => s.id))
  for (const v of votes) {
    if (!suggestionIds.has(v.suggestion_id)) {
      problems.push(`vote references missing suggestion ${v.suggestion_id}`)
    }
  }
}

if (problems.length > 0) {
  console.error(`Data lint found ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(`Data lint passed: ${suggestions?.length ?? 0} suggestions, ${meetings?.length ?? 0} meetings, ${votes?.length ?? 0} votes checked.`)
