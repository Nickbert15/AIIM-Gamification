import { createClient } from '@supabase/supabase-js'

// Next.js patches global fetch and caches identical request URLs in its Data
// Cache. supabase-js reuses the same REST URL for a given query, so without
// this the leaderboard would serve stale score sums after a new score is
// written. Opt every admin read out of that cache.
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: noStoreFetch } },
)

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Prefer service role key for server-side queries; fall back to anon key
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { global: { fetch: noStoreFetch } })
}
