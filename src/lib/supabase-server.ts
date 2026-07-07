import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    // Next.js patches global fetch and caches identical request URLs in its Data
    // Cache. supabase-js reuses the same REST URL for a given query, so without
    // this the leaderboard would serve stale score sums after a new score is
    // written. Opt every admin read out of that cache.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  },
)
