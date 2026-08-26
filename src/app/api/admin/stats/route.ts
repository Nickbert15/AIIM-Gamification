import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Overview metrics are computed server-side via the service-role key. The anon key
// has no read access on the underlying players/scores tables (RLS), which is why
// direct client-side reads for the overview used to return nothing ("zeros everywhere").
export async function GET() {
  if (!(await getSessionAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [{ count: playerCount }, { data: scores }, { data: recent }] = await Promise.all([
    supabaseAdmin.from('players').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('scores').select('score, game_id'),
    supabaseAdmin
      .from('scores')
      .select('score, game_id, completed_at, players(display_name, role)')
      .order('completed_at', { ascending: false })
      .limit(8),
  ])

  const scoreList = scores ?? []
  const gamesPlayed = scoreList.length
  const distinctGames = new Set(scoreList.map((s) => s.game_id)).size
  const avgScore = gamesPlayed
    ? Math.round(scoreList.reduce((sum, s) => sum + (s.score ?? 0), 0) / gamesPlayed)
    : 0

  // For rounds played in-app, scores.game_id is the games.id (UUID); resolve the
  // title for the activity list. Legacy/foreign values (not a UUID) fall back to
  // the raw ID and are never even queried against the uuid column.
  const recentList = recent ?? []
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const gameIds = Array.from(
    new Set(
      recentList
        .map((r) => r.game_id)
        .filter((id): id is string => typeof id === 'string' && uuidRe.test(id))
    )
  )

  const titleById = new Map<string, string>()
  if (gameIds.length > 0) {
    const { data: games } = await supabaseAdmin.from('games').select('id, title').in('id', gameIds)
    for (const g of games ?? []) titleById.set(g.id, g.title)
  }

  const recentWithTitle = recentList.map((r) => ({
    ...r,
    game_title: titleById.get(r.game_id) ?? null,
  }))

  return NextResponse.json({
    players: playerCount ?? 0,
    gamesPlayed,
    distinctGames,
    avgScore,
    recent: recentWithTitle,
  })
}
