import { supabaseAdmin } from './supabase-server'
import { computeStreak } from './gamification'

/**
 * Schreibt die persistenten Gamification-Werte auf `players` fort (score,
 * current_streak, last_played_at) — einmal pro abgeschlossenem Play aufrufen.
 * Die Streak zählt jeden Abschluss; wie viele Punkte gutgeschrieben werden,
 * entscheidet der Aufrufer, weil das Bestanden-Kriterium je Spieltyp verschieden ist.
 * Fehler werden nur geloggt: das eigentliche Spielergebnis ist zu diesem Zeitpunkt
 * bereits gespeichert und soll dadurch nicht kippen.
 */
export async function applyPlayGamification(playerId: string, awardedPoints: number): Promise<void> {
  const { data: player, error } = await supabaseAdmin
    .from('players')
    .select('score, current_streak, last_played_at')
    .eq('id', playerId)
    .single()

  if (error || !player) {
    console.error('[gamification] Spieler für Update nicht gefunden:', error)
    return
  }

  const now = new Date()
  const newStreak = computeStreak(
    player.last_played_at ? new Date(player.last_played_at) : null,
    now,
    player.current_streak
  )

  const { error: updateError } = await supabaseAdmin
    .from('players')
    .update({
      score: player.score + awardedPoints,
      current_streak: newStreak,
      last_played_at: now.toISOString(),
    })
    .eq('id', playerId)

  if (updateError) console.error('[gamification] Update fehlgeschlagen:', updateError)
}
