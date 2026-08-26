import { supabaseAdmin } from '@/lib/supabase-server'

export interface AiProcessLogEntry {
  /** Kurzer, stabiler Bezeichner des Aufrufers, z. B. "excel.execute", "game.regenerate". */
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

// Darf den aufrufenden KI-Prozess niemals blockieren oder zum Absturz bringen —
// ein fehlgeschlagener Log-Insert ist nie ein Grund, den eigentlichen Request scheitern zu lassen.
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
