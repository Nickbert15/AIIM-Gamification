import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [{ data: players }, { data: scores }] = await Promise.all([
    supabaseAdmin.from('players').select('id, display_name, role'),
    supabaseAdmin.from('scores').select('player_id, score'),
  ])

  if (!players) return NextResponse.json([], { status: 500 })

  const totals = new Map<string, { total_score: number; games_played: number }>()
  for (const s of scores ?? []) {
    const entry = totals.get(s.player_id) ?? { total_score: 0, games_played: 0 }
    entry.total_score += s.score ?? 0
    entry.games_played += 1
    totals.set(s.player_id, entry)
  }

  const rows = players
    .map((p: any) => ({
      display_name: p.display_name,
      role: p.role,
      total_score: totals.get(p.id)?.total_score ?? 0,
      games_played: totals.get(p.id)?.games_played ?? 0,
    }))
    .sort((a, b) => b.total_score - a.total_score)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return NextResponse.json(rows)
}
