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

  const [{ data: player }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from('players')
      .select('id, email, display_name, role')
      .eq('id', playerId)
      .single(),

    supabaseAdmin
      .from('scores')
      .select('id, score, completed_at, games(id, title)')
      .eq('player_id', playerId)
      .order('completed_at', { ascending: false }),
  ])

  if (!player) return NextResponse.json({ error: 'player_not_found' }, { status: 404 })

  const rows = history ?? []
  const total_score = rows.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0)

  return NextResponse.json({
    player,
    stats: {
      games_played: rows.length,
      total_score,
      avg_score: rows.length ? total_score / rows.length : 0,
      best_score: rows.reduce((max: number, r: any) => Math.max(max, r.score ?? 0), 0),
    },
    history: rows,
  })
}
