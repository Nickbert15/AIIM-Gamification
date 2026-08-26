import { supabaseAdmin } from '@/lib/supabase-server'

export interface AiProcessLogEntry {
  /** Short, stable identifier of the caller, e.g. "excel.execute", "game.regenerate". */
  source: string
  actorId?: string | null
  gameId?: string | null
  model?: string | null
  status: 'success' | 'error'
  durationMs?: number | null
  request?: unknown
  response?: unknown
  errorMessage?: string | null
  meta?: Record<string, unknown> | null
}

// Must never block or crash the calling AI process — a failed log insert is never
// a reason to fail the actual request.
export async function recordAiProcessLog(entry: AiProcessLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('ai_process_logs').insert({
      source: entry.source,
      actor_id: entry.actorId ?? null,
      game_id: entry.gameId ?? null,
      model: entry.model ?? null,
      status: entry.status,
      duration_ms: entry.durationMs ?? null,
      request: entry.request ?? null,
      response: entry.response ?? null,
      error_message: entry.errorMessage ?? null,
      meta: entry.meta ?? null,
    })
    if (error) console.error('[aiLog] Insert fehlgeschlagen:', error.message)
  } catch (err) {
    console.error('[aiLog] Insert-Fehler:', err)
  }
}
