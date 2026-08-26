const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

// Monday 00:00 UTC of the ISO week that `d` falls into. This anchor lets us
// compare two dates as an integer week difference — including year boundaries,
// where calendar week and calendar year diverge (week 52 -> week 01).
function startOfIsoWeekUTC(d: Date): number {
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay() // Mon=1 … Sun=7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (isoDay - 1))
}

/** Integer difference in ISO weeks between the weeks of `from` and `to`. */
function weeksBetween(from: Date, to: Date): number {
  return (startOfIsoWeekUTC(to) - startOfIsoWeekUTC(from)) / MS_PER_WEEK
}

/**
 * Sequential ISO week number since the Unix epoch. Stable within a week and
 * monotonic — suitable as a seed for weekly-rotating selection.
 */
export function isoWeekIndex(d: Date): number {
  return Math.floor(startOfIsoWeekUTC(d) / MS_PER_WEEK)
}

/**
 * Advances the weekly streak. The unit is the ISO calendar week: the first
 * completed play per week counts, further plays in the same week leave the
 * streak unchanged.
 */
export function computeStreak(lastPlayedAt: Date | null, now: Date, currentStreak: number): number {
  if (lastPlayedAt === null) return 1

  const gap = weeksBetween(lastPlayedAt, now)
  if (gap === 0) return currentStreak // already counted this week
  if (gap === 1) return currentStreak + 1 // immediately following week
  return 1 // gap > 1 week (or a backwards time jump): streak broken
}
