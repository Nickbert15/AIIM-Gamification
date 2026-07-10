import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionToken, verifyToken } from '@/lib/auth'
import { applyPlayGamification } from '@/lib/playerGamification'

export async function POST(req: NextRequest) {
  const token = getSessionToken()
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let playerId: string
  try {
    playerId = await verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const { game_id, score } = await req.json()
  if (!game_id || typeof score !== 'number' || Number.isNaN(score)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('scores').insert({
    player_id: playerId,
    game_id,
    score,
    completed_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Zählt den Play für Streak & Weekly-Score. Quiz/Hallucination/Arena haben kein
  // Bestanden-Kriterium wie die Excel-Challenge (dort: maxPoints bei Bestehen) —
  // gutgeschrieben werden deshalb die tatsächlich erreichten Punkte.
  await applyPlayGamification(playerId, score)

  return NextResponse.json({ ok: true })
}
