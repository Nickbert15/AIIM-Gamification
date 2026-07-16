import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Übersichts-Kennzahlen serverseitig über den Service-Role-Key. Der Anon-Key hat
// auf den Basistabellen players/scores keine Leserechte (RLS), deshalb liefen die
// direkten Client-Reads der Übersicht ins Leere ("überall 0").
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

  // scores.game_id ist die games.id (UUID) bei in-App gespielten Runden; für die
  // Aktivitätsliste den Titel auflösen. Alt-/Fremdwerte (kein UUID) fallen auf die
  // rohe ID zurück und werden gar nicht erst gegen die uuid-Spalte gequery't.
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
