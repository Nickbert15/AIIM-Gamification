const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

// Montag 00:00 UTC der ISO-Woche, in der `d` liegt. Über diesen Anker lassen sich
// zwei Daten als ganzzahlige Wochendifferenz vergleichen — inklusive Jahreswechsel,
// wo Kalenderwoche und Kalenderjahr auseinanderlaufen (KW52 -> KW01).
function startOfIsoWeekUTC(d: Date): number {
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay() // Mo=1 … So=7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (isoDay - 1))
}

/** Ganzzahlige Differenz in ISO-Wochen zwischen den Wochen von `from` und `to`. */
function weeksBetween(from: Date, to: Date): number {
  return (startOfIsoWeekUTC(to) - startOfIsoWeekUTC(from)) / MS_PER_WEEK
}

/**
 * Fortlaufende Nummer der ISO-Woche seit der Unix-Epoche. Stabil innerhalb einer
 * Woche und monoton — geeignet als Seed für wöchentlich wechselnde Auswahl.
 */
export function isoWeekIndex(d: Date): number {
  return Math.floor(startOfIsoWeekUTC(d) / MS_PER_WEEK)
}

/**
 * Fortschreibung der Wochen-Serie. Einheit ist die ISO-Kalenderwoche:
 * pro Woche zählt der erste abgeschlossene Play, weitere Plays derselben
 * Woche lassen die Serie unverändert.
 */
export function computeStreak(lastPlayedAt: Date | null, now: Date, currentStreak: number): number {
  if (lastPlayedAt === null) return 1

  const gap = weeksBetween(lastPlayedAt, now)
  if (gap === 0) return currentStreak // diese Woche bereits gezählt
  if (gap === 1) return currentStreak + 1 // direkt anschließende Woche
  return 1 // Lücke > 1 Woche (oder Zeitsprung rückwärts): Serie gerissen
}
