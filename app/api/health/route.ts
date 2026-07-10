import { createClient } from "@supabase/supabase-js"
import { table } from "@/lib/table"

// Health check for uptime monitoring (e.g. UptimeRobot pings this URL).
// Checks all four tables individually (not just "meetings") and reports the
// deployed commit, so an alert tells us not just "it's down" but which
// table failed and which deploy is live.
export const dynamic = "force-dynamic"

const CHECKED_TABLES = ["suggestions", "votes", "meetings", "meeting_rsvps"] as const

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown"

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Supabase env vars missing", commit },
      { status: 503 },
    )
  }

  const supabase = createClient(url, key)

  const results = await Promise.all(
    CHECKED_TABLES.map(async (name) => {
      const start = Date.now()
      try {
        // head+count touches the table without assuming any particular column
        // (votes / meeting_rsvps are join tables with composite keys, no id).
        const { error } = await supabase.from(table(name)).select("*", { count: "exact", head: true })
        const ms = Date.now() - start
        if (error) return { table: name, ok: false, ms, error: error.message }
        return { table: name, ok: true, ms }
      } catch (e) {
        return { table: name, ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )

  const ok = results.every((r) => r.ok)
  return Response.json({ ok, commit, tables: results }, { status: ok ? 200 : 503 })
}
