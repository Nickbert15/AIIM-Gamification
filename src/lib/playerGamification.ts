import { supabaseAdmin } from './supabase-server'
import { computeStreak } from './gamification'

/**
 * Persists the gamification values on `players` (score, current_streak,
 * last_played_at) — call once per completed play. The streak counts every
 * completion; how many points get awarded is decided by the caller, since
 * the pass criterion differs per game type. Errors are only logged: the
 * actual play result has already been saved at this point and shouldn't be
 * jeopardized by this.
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
