import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { signToken, setSessionCookie } from '@/lib/auth'

// Hash von "invalid" — verglichen wird auch bei unbekannter E-Mail, damit die
// Antwortzeit nicht verrät, ob ein Account existiert.
const DUMMY_HASH = '$2b$12$a7FlSupVojhAo8jLi5AoleB3sMoAtakFMOqqjxUcKS/oXVgc7505y'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, email, display_name, role, is_admin, password_hash')
    .ilike('email', email.trim())
    .maybeSingle()

  const valid = await bcrypt.compare(password, player?.password_hash ?? DUMMY_HASH)
  if (!player?.password_hash || !valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  setSessionCookie(await signToken(player.id))

  const { password_hash: _, ...safe } = player
  return NextResponse.json(safe)
}
