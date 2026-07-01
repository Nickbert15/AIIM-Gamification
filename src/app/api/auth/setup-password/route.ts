import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { signToken, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'password_too_short' }, { status: 400 })

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, email, display_name, role, password_hash')
    .ilike('email', email.trim())
    .single()

  if (!player) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (player.password_hash) return NextResponse.json({ error: 'already_set' }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  await supabaseAdmin.from('players').update({ password_hash: hash }).eq('id', player.id)

  const token = await signToken(player.id)
  setSessionCookie(token)

  const { password_hash: _, ...safe } = player
  return NextResponse.json(safe)
}
