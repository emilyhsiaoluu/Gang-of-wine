import { createClient } from "@supabase/supabase-js"

// Health check for uptime monitoring (e.g. UptimeRobot pings this URL).
// Returns 200 when the app can reach Supabase and read data, 503 otherwise —
// so a monitor on this endpoint catches both hosting and database problems.
export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return Response.json({ ok: false, error: "Supabase env vars missing" }, { status: 503 })
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from("meetings").select("id").limit(1)
    if (error) throw new Error(error.message)
    return Response.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: message }, { status: 503 })
  }
}
