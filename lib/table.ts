// Staging shares a Supabase project with other apps (no separate free tier
// project available), so its tables are prefixed to avoid name collisions —
// e.g. "gow_suggestions" instead of "suggestions". Set
// NEXT_PUBLIC_TABLE_PREFIX="gow_" on the staging/preview environment only;
// production leaves it unset and keeps the original unprefixed table names.
// Shared by lib/data.ts and app/api/health/route.ts so both ever query the
// same tables for a given environment.
const TABLE_PREFIX = process.env.NEXT_PUBLIC_TABLE_PREFIX ?? ""

export const table = (name: string) => `${TABLE_PREFIX}${name}`
