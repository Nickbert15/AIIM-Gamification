import { describe, expect, it } from 'vitest'
import { computeStreak } from './gamification'

const utc = (iso: string) => new Date(`${iso}T12:00:00.000Z`)

describe('computeStreak', () => {
  it('startet die Serie beim allerersten Play', () => {
    expect(computeStreak(null, utc('2024-03-06'), 0)).toBe(1)
  })

  it('lässt die Serie unverändert, wenn diese Woche schon gespielt wurde', () => {
    // beide in der ISO-Woche vom Mo 2024-03-04
    expect(computeStreak(utc('2024-03-04'), utc('2024-03-08'), 5)).toBe(5)
  })

  it('zählt Sonntag noch zur laufenden ISO-Woche (Woche endet So, nicht Sa)', () => {
    expect(computeStreak(utc('2024-03-04'), utc('2024-03-10'), 3)).toBe(3)
  })

  it('erhöht die Serie, wenn zuletzt in der Vorwoche gespielt wurde', () => {
    expect(computeStreak(utc('2024-02-26'), utc('2024-03-04'), 5)).toBe(6)
  })

  it('erhöht die Serie über den Jahreswechsel hinweg (KW52 -> KW01)', () => {
    // Fr 2019-12-27 liegt in 2019-W52, Do 2020-01-02 in 2020-W01 — direkt aufeinanderfolgend
    expect(computeStreak(utc('2019-12-27'), utc('2020-01-02'), 4)).toBe(5)
  })

  it('reißt die Serie bei einer Lücke von genau 2 Wochen', () => {
    expect(computeStreak(utc('2024-01-01'), utc('2024-01-15'), 9)).toBe(1)
  })

  it('reißt die Serie bei einer Lücke von mehreren Wochen', () => {
    expect(computeStreak(utc('2024-01-01'), utc('2024-02-19'), 9)).toBe(1)
  })

  it('reißt die Serie auch über den Jahreswechsel, wenn eine Woche fehlt', () => {
    // 2019-W52 -> 2020-W02, dazwischen fehlt 2020-W01
    expect(computeStreak(utc('2019-12-27'), utc('2020-01-09'), 4)).toBe(1)
  })
})
