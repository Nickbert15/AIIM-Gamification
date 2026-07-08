import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export type KnowledgeTopic = {
  id: string
  created_at: string
  title: string
  summary: string
  relevance_category: 'finance' | 'ai-tools' | 'ai-general'
  source: string
  link: string
  learning_potential: 'hoch' | 'mittel' | 'niedrig'
  suggested_game_type: 'multiple-choice' | 'chat_challenge'
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('knowledge_topics')
      .select(
        'id, created_at, title, summary, relevance_category, source, link, learning_potential, suggested_game_type'
      )
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error

    return NextResponse.json({ topics: (data ?? []) as KnowledgeTopic[] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ topics: [], error: message }, { status: 500 })
  }
}
