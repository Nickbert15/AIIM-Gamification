import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 })

// Lesen/Eintragen/Löschen laufen über den Service-Role-Key. Der Anon-Key hat auf der
// scores-Tabelle keine Rechte (RLS), deshalb liefen die früheren Client-Calls dieser
// Seite ins Leere.
export async function GET() {
  if (!(await getSessionAdmin())) return forbidden()

  const { data, error } = await supabaseAdmin
    .from('scores')
    .select('id, player_id, game_id, score, completed_at, players(display_name, role)')
    .order('completed_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  if (!(await getSessionAdmin())) return forbidden()

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin.from('scores').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
