import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const [{ data: players }, { data: scores }] = await Promise.all([
    supabaseAdmin.from('players').select('id, display_name, role'),
    supabaseAdmin.from('player_scores').select('player_id, total_score'),
  ])

  if (!players) return NextResponse.json([], { status: 500 })

  const scoreMap = new Map((scores ?? []).map((s: any) => [s.player_id, s.total_score ?? 0]))

  const rows = players
    .map((p: any) => ({ display_name: p.display_name, role: p.role, total_score: scoreMap.get(p.id) ?? 0 }))
    .sort((a: any, b: any) => b.total_score - a.total_score)
    .map((p: any, i: number) => ({ ...p, rank: i + 1 }))

  return NextResponse.json(rows)
}
