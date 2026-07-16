import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionToken, verifyToken } from '@/lib/auth'

const MAX_COMMENT_LENGTH = 1000

export async function POST(req: NextRequest) {
  const token = getSessionToken()
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let playerId: string
  try {
    playerId = await verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const { game_id, game_title, rating, comment } = await req.json()

  if (!game_id || typeof game_id !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 3) {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 })
  }

  const trimmedComment =
    typeof comment === 'string' && comment.trim() ? comment.trim().slice(0, MAX_COMMENT_LENGTH) : null

  const { error } = await supabaseAdmin.from('game_feedback').insert({
    game_id,
    game_title: typeof game_title === 'string' && game_title.trim() ? game_title.trim() : null,
    player_id: playerId,
    rating,
    comment: trimmedComment,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
