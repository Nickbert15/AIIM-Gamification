export interface AttemptCheckResult {
  allowed: boolean
  reason?: string
}

// Trivial client-reported check for now (no persistent server-side state) — kept behind
// this function so a later DB-backed implementation (a real attempts table + atomic
// increment) can replace the body without touching any caller.
export function checkAndConsumeAttempt(
  gameId: string,
  playerId: string | null,
  attemptsUsed: number,
  maxAttempts: number
): AttemptCheckResult {
  if (playerId === null) return { allowed: true }
  if (attemptsUsed >= maxAttempts) {
    return { allowed: false, reason: 'Keine Versuche mehr übrig' }
  }
  return { allowed: true }
}
