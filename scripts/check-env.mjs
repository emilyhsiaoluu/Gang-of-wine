// Runs before every build (see package.json "prebuild"). Fails the build
// loudly if Supabase env vars are missing, instead of silently shipping a
// bundle with no database credentials — see the Jul 9-10 outage in
// docs/RELIABILITY_PLAN.md.
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  // Preview deploys hit the staging database and can't hurt anyone, and a
  // deployed preview with an error banner (plus /api/health's env readout)
  // is debuggable from outside, unlike a failed build whose logs only the
  // Vercel dashboard can see. Production keeps the hard block.
  if (process.env.VERCEL_ENV === "preview") {
    console.warn(`\nWARNING (preview build allowed to continue): missing env variable(s): ${missing.join(", ")}`)
    console.warn("Check /api/health on the deployed preview for the full env readout.\n")
  } else {
    console.error(`\nBuild blocked: missing required environment variable(s): ${missing.join(", ")}`)
    console.error("Add them in Vercel -> Settings -> Environment Variables (Production scope), then redeploy.\n")
    process.exit(1)
  }
} else {
  console.log("Env check passed: Supabase vars present.")
}
