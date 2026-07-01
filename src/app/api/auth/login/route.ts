import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { signToken, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, email, display_name, role, password_hash')
    .ilike('email', email.trim())
    .single()

  if (!player?.password_hash) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, player.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = await signToken(player.id)
  setSessionCookie(token)

  const { password_hash: _, ...safe } = player
  return NextResponse.json(safe)
}
