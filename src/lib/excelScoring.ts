export function computeExcelPoints(
  scorePct: number,
  attemptsUsed: number,
  maxAttempts: number,
  maxPoints: number
): number {
  const basePoints = Math.round(maxPoints * (scorePct / 100))
  const bonusFactor = maxAttempts > 1
    ? Math.max(0, Math.min(1, (maxAttempts - attemptsUsed) / (maxAttempts - 1)))
    : 0
  const bonus = Math.round(basePoints * 0.2 * bonusFactor)
  return basePoints + bonus
}
