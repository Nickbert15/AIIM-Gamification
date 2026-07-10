import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionPlayer } from '@/lib/auth'

export async function GET() {
  const player = await getSessionPlayer()
  if (!player) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: history } = await supabaseAdmin
    .from('scores')
    .select('id, score, completed_at, games(id, title)')
    .eq('player_id', player.id)
    .order('completed_at', { ascending: false })

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
