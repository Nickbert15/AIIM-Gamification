import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('players')
    .select('id, password_hash')
    .ilike('email', email.trim())
    .single()

  if (!data) return NextResponse.json({ exists: false })

  return NextResponse.json({ exists: true, hasPassword: !!data.password_hash })
}
