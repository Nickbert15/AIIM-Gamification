import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const FORMAT_LABELS: Record<string, string> = {
  excel_challenge: 'Excel Challenge',
  hallucination_spotter_v2: 'Hallucination Spotter',
  prompt_arena: 'Prompt Arena',
  prompt_branching: 'Prompt-Navigator',
}

// Spieltyp ableiten — gleiche Erkennung wie im Spieler-Modal (games.format bzw.
// game_json.format, Quiz über vorhandene Fragen).
function gameTypeLabel(game: { format: string | null; game_json: Record<string, unknown> | null }): string {
  const gj = game.game_json ?? {}
  const gjFormat = typeof gj.format === 'string' ? gj.format : null
  if (game.format && FORMAT_LABELS[game.format]) return FORMAT_LABELS[game.format]
  if (gjFormat && FORMAT_LABELS[gjFormat]) return FORMAT_LABELS[gjFormat]
  if (Array.isArray(gj.questions) && gj.questions.length > 0) return 'Quiz'
  return game.format || 'Unbekannt'
}

export async function GET() {
  if (!(await getSessionAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('game_feedback')
    .select('id, game_id, game_title, rating, comment, created_at, players(display_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []

  // Feedback speichert keinen Spieltyp — game_id (UUID) frisch gegen games auflösen.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const gameIds = Array.from(
    new Set(
      rows
        .map((r) => r.game_id)
        .filter((id): id is string => typeof id === 'string' && uuidRe.test(id))
    )
  )

  const gameById = new Map<string, { title: string | null; type: string }>()
  if (gameIds.length > 0) {
    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, title, format, game_json')
      .in('id', gameIds)
    for (const g of games ?? []) {
      gameById.set(g.id, { title: g.title ?? null, type: gameTypeLabel(g) })
    }
  }

  const enriched = rows.map((r) => {
    const g = typeof r.game_id === 'string' ? gameById.get(r.game_id) : undefined
    return {
      ...r,
      game_title: r.game_title ?? g?.title ?? null,
      game_type: g?.type ?? 'Unbekannt',
    }
  })

  return NextResponse.json(enriched)
}
