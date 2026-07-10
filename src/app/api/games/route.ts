import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('games')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
