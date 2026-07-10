import { describe, expect, it } from 'vitest'
import { Game } from '@/types/game'
import {
  recommendGames,
  relativePerformance,
  targetDifficulty,
  RecommendationContext,
} from './recommendations'

function game(id: string, topic: string | null, difficulty: string | null, maxPoints = 100): Game {
  return {
    id,
    title: `Spiel ${id}`,
    format: 'excel_challenge',
    library_type: null,
    target_role: null,
    difficulty,
    language: 'de',
    topic,
    persona_key: null,
    learning_objective: null,
    game_json: { scoring: { maxPoints, passingScore: maxPoints } },
    status: 'approved',
    source_attribution: null,
    created_at: '2024-01-01T00:00:00Z',
  }
}

const MONDAY = new Date('2024-03-04T09:00:00.000Z')
const SAME_WEEK_FRIDAY = new Date('2024-03-08T09:00:00.000Z')
const NEXT_WEEK = new Date('2024-03-11T09:00:00.000Z')

const ctx = (over: Partial<RecommendationContext> = {}): RecommendationContext => ({
  playerId: 'player-1',
  role: 'Controller',
  played: [],
  now: MONDAY,
  ...over,
})

describe('relativePerformance', () => {
  it('gibt null zurück, wenn keine Historie vorliegt', () => {
    expect(relativePerformance([], [game('a', null, null)])).toBeNull()
  })

  it('normalisiert rohe Scores gegen die maxPoints des jeweiligen Spiels', () => {
    const games = [game('a', null, null, 100), game('b', null, null, 20)]
    // 50/100 = 0.5 und 10/20 = 0.5 -> Mittel 0.5, trotz sehr unterschiedlicher Rohwerte
    const perf = relativePerformance([{ gameId: 'a', score: 50 }, { gameId: 'b', score: 10 }], games)
    expect(perf).toBeCloseTo(0.5)
  })

  it('ignoriert Historie zu Spielen, die nicht mehr im Katalog stehen', () => {
    const perf = relativePerformance([{ gameId: 'weg', score: 999 }], [game('a', null, null)])
    expect(perf).toBeNull()
  })
})

describe('targetDifficulty', () => {
  it('startet Neulinge bei easy', () => {
    expect(targetDifficulty(null)).toBe('easy')
  })

  it('staffelt nach relativer Leistung', () => {
    expect(targetDifficulty(0.2)).toBe('easy')
    expect(targetDifficulty(0.5)).toBe('medium')
    expect(targetDifficulty(0.9)).toBe('hard')
  })
})

describe('recommendGames', () => {
  it('liefert nichts, wenn der Katalog leer ist', () => {
    const res = recommendGames([], ctx())
    expect(res.gameOfTheWeek).toBeNull()
    expect(res.alsoLike).toEqual([])
  })

  it('wählt als Wochenspiel nie ein bereits gespieltes Spiel, solange Ungespieltes existiert', () => {
    const games = [game('a', 'controlling', 'easy'), game('b', 'controlling', 'easy')]
    const res = recommendGames(games, ctx({ played: [{ gameId: 'a', score: 10 }] }))

    expect(res.gameOfTheWeek?.id).toBe('b')
    expect(res.replaying).toBe(false)
  })

  it('füllt die Alternativen mit bereits gespielten Spielen auf, Ungespieltes zuerst', () => {
    const games = [
      game('gespielt-1', 'controlling', 'easy'),
      game('gespielt-2', 'controlling', 'easy'),
      game('neu-1', 'controlling', 'easy'),
      game('neu-2', 'controlling', 'easy'),
    ]
    const res = recommendGames(games, ctx({
      played: [{ gameId: 'gespielt-1', score: 10 }, { gameId: 'gespielt-2', score: 10 }],
    }))

    expect(res.gameOfTheWeek?.id).toMatch(/^neu-/)
    expect(res.alsoLike).toHaveLength(3)
    // das verbleibende ungespielte Spiel steht vor den Wiederholungen
    expect(res.alsoLike[0].id).toMatch(/^neu-/)
    expect(res.alsoLike.map(g => g.id)).not.toContain(res.gameOfTheWeek!.id)
  })

  it('lässt Wiederholungen zu, statt ein leeres Dashboard zu zeigen', () => {
    const games = [game('a', 'controlling', 'easy')]
    const res = recommendGames(games, ctx({ played: [{ gameId: 'a', score: 10 }] }))

    expect(res.gameOfTheWeek?.id).toBe('a')
    expect(res.replaying).toBe(true)
  })

  it('bevorzugt Topics, die zur Rolle des Spielers passen', () => {
    // Controller -> controlling; beide easy, damit nur das Topic den Ausschlag gibt
    const games = [game('fremd', 'steuern', 'easy'), game('passend', 'controlling', 'easy')]
    const res = recommendGames(games, ctx({ role: 'Controller' }))

    expect(res.gameOfTheWeek?.id).toBe('passend')
  })

  it('bevorzugt bei starker Leistung schwerere Spiele', () => {
    const catalog = [game('gespielt', 'steuern', 'medium', 100)]
    const games = [...catalog, game('leicht', 'steuern', 'easy'), game('schwer', 'steuern', 'hard')]
    // 95/100 -> hard als Zielschwierigkeit
    const res = recommendGames(games, ctx({ role: 'Other', played: [{ gameId: 'gespielt', score: 95 }] }))

    expect(res.gameOfTheWeek?.id).toBe('schwer')
  })

  it('gibt höchstens drei Alternativen zurück und wiederholt das Wochenspiel nicht', () => {
    const games = ['a', 'b', 'c', 'd', 'e'].map(id => game(id, 'controlling', 'easy'))
    const res = recommendGames(games, ctx())

    expect(res.alsoLike).toHaveLength(3)
    expect(res.alsoLike.map(g => g.id)).not.toContain(res.gameOfTheWeek!.id)
  })

  it('bleibt innerhalb einer ISO-Woche stabil', () => {
    const games = ['a', 'b', 'c', 'd'].map(id => game(id, 'controlling', 'easy'))
    const montag = recommendGames(games, ctx({ now: MONDAY }))
    const freitag = recommendGames(games, ctx({ now: SAME_WEEK_FRIDAY }))

    expect(freitag.gameOfTheWeek?.id).toBe(montag.gameOfTheWeek?.id)
    expect(freitag.alsoLike.map(g => g.id)).toEqual(montag.alsoLike.map(g => g.id))
  })

  it('wählt für verschiedene Spieler unterschiedliche Wochenspiele', () => {
    const games = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => game(id, 'controlling', 'easy'))
    const picks = new Set(
      ['p1', 'p2', 'p3', 'p4', 'p5'].map(id => recommendGames(games, ctx({ playerId: id })).gameOfTheWeek?.id)
    )

    expect(picks.size).toBeGreaterThan(1)
  })

  it('rotiert das Wochenspiel über die Wochen hinweg', () => {
    const games = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => game(id, 'controlling', 'easy'))
    const weeks = [0, 1, 2, 3, 4, 5].map(offset => {
      const now = new Date(MONDAY.getTime() + offset * 7 * 24 * 3600 * 1000)
      return recommendGames(games, ctx({ now })).gameOfTheWeek?.id
    })

    expect(new Set(weeks).size).toBeGreaterThan(1)
  })

  it('wechselt das Wochenspiel zur Folgewoche bei gleichem Spieler', () => {
    const games = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => game(id, 'controlling', 'easy'))
    const diese = recommendGames(games, ctx({ now: MONDAY }))
    const naechste = recommendGames(games, ctx({ now: NEXT_WEEK }))

    // Nicht garantiert verschieden (Zufall darf treffen), aber der Seed muss sich ändern:
    // die Gesamtreihenfolge der Alternativen soll nicht identisch bleiben.
    const gleich =
      diese.gameOfTheWeek?.id === naechste.gameOfTheWeek?.id &&
      diese.alsoLike.map(g => g.id).join() === naechste.alsoLike.map(g => g.id).join()
    expect(gleich).toBe(false)
  })
})
