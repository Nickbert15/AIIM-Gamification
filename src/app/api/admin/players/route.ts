import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSessionAdmin } from '@/lib/auth'

const SELECT = 'id, email, display_name, role, is_admin, created_at'

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 })

export async function GET() {
  if (!(await getSessionAdmin())) return forbidden()

  const { data, error } = await supabaseAdmin
    .from('players')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!(await getSessionAdmin())) return forbidden()

  const { email, display_name, role, password, is_admin } = await req.json()
  if (!email || !display_name || !password) {
    return NextResponse.json({ error: 'E-Mail, Anzeigename und Passwort sind Pflichtfelder.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen haben.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({
      email: email.trim(),
      display_name: display_name.trim(),
      role: role ?? 'Controller',
      is_admin: is_admin === true,
      password_hash: await bcrypt.hash(password, 12),
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const admin = await getSessionAdmin()
  if (!admin) return forbidden()

  const { id, password, is_admin } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Sonst könnte sich der letzte Admin selbst aussperren.
  if (is_admin === false && id === admin.id) {
    return NextResponse.json({ error: 'Du kannst dir die Admin-Rolle nicht selbst entziehen.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof is_admin === 'boolean') patch.is_admin = is_admin
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen haben.' }, { status: 400 })
    }
    patch.password_hash = await bcrypt.hash(password, 12)
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nichts zu ändern.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('players').update(patch).eq('id', id).select(SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const admin = await getSessionAdmin()
  if (!admin) return forbidden()

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (id === admin.id) {
    return NextResponse.json({ error: 'Du kannst dich nicht selbst löschen.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('players').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
