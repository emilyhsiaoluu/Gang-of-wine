// Runs before every build (see package.json "prebuild"). Fails the build
// loudly if Supabase env vars are missing, instead of silently shipping a
// bundle with no database credentials — see the Jul 9-10 outage in
// docs/RELIABILITY_PLAN.md.
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error(`\nBuild blocked: missing required environment variable(s): ${missing.join(", ")}`)
  console.error("Add them in Vercel -> Settings -> Environment Variables (Production scope), then redeploy.\n")
  process.exit(1)
}

console.log("Env check passed: Supabase vars present.")
