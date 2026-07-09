import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionToken, verifyToken } from '@/lib/auth'

export async function GET() {
  const token = getSessionToken()
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let playerId: string
  try {
    playerId = await verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const [{ data: player }, { data: stats }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from('players')
      .select('id, email, display_name, role')
      .eq('id', playerId)
      .single(),

    supabaseAdmin
      .from('player_scores')
      .select('games_played, total_score, avg_score, best_score')
      .eq('player_id', playerId)
      .single(),

    supabaseAdmin
      .from('scores')
      .select('id, score, completed_at, games(id, title)')
      .eq('player_id', playerId)
      .order('completed_at', { ascending: false }),
  ])

  if (!player) return NextResponse.json({ error: 'player_not_found' }, { status: 404 })

  return NextResponse.json({
    player,
    stats: {
      games_played: stats?.games_played ?? 0,
      total_score: stats?.total_score ?? 0,
      avg_score: stats?.avg_score ?? 0,
      best_score: stats?.best_score ?? 0,
    },
    history: history ?? [],
  })
}
