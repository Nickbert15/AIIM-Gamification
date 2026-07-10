import { Game } from '@/types/game'
import { isoWeekIndex } from './gamification'

export type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Rolle -> fachlich naheliegende Topics. Bewusst im Code und nicht in der DB:
 * `games.target_role` wird von keinem Generator sinnvoll befüllt (hart auf
 * 'Financial Analyst' bzw. null), taugt also nicht als Matching-Schlüssel.
 * Rollen stammen aus admin/players, Topics aus GenerateGameModal.
 */
export const ROLE_TOPIC_AFFINITY: Record<string, string[]> = {
  'Controller': ['controlling', 'reporting', 'kostenrechnung'],
  'Senior Controller': ['controlling', 'konsolidierung', 'reporting'],
  'Finance Manager': ['finanzabschluss', 'reporting', 'treasury'],
  'CFO': ['konsolidierung', 'finanzabschluss', 'treasury'],
  'Analyst': ['reporting', 'controlling', 'kostenrechnung'],
  'Other': [],
}

export interface PlayedGame {
  gameId: string
  score: number
}

export interface RecommendationContext {
  playerId: string
  role: string
  played: PlayedGame[]
  now: Date
}

export interface Recommendations {
  gameOfTheWeek: Game | null
  alsoLike: Game[]
  /** true, wenn der Spieler bereits alles gespielt hat und Wiederholungen gezeigt werden. */
  replaying: boolean
}

/** Erreichbare Punktzahl eines Spiels — nötig, um rohe Scores vergleichbar zu machen. */
function maxPointsOf(game: Game): number {
  const declared = game.game_json?.scoring?.maxPoints
  if (typeof declared === 'number' && declared > 0) return declared
  const questions = game.game_json?.questions?.length ?? 0
  if (questions > 0) return questions * 10 // QUIZ_POINTS_PER_CORRECT
  return 100
}

/**
 * Mittlere relative Leistung (0..1) über alle gespielten Spiele, die noch im
 * Katalog stehen. `null`, wenn keine verwertbare Historie vorliegt.
 * Normalisiert bewusst gegen maxPoints je Spiel — der rohe Score aus `scores`
 * ist zwischen Quiz und Excel-Challenge nicht vergleichbar.
 */
export function relativePerformance(played: PlayedGame[], games: Game[]): number | null {
  const byId = new Map(games.map(g => [g.id, g]))
  const ratios: number[] = []

  for (const p of played) {
    const game = byId.get(p.gameId)
    if (!game) continue
    const max = maxPointsOf(game)
    ratios.push(Math.max(0, Math.min(1, p.score / max)))
  }

  if (ratios.length === 0) return null
  return ratios.reduce((a, b) => a + b, 0) / ratios.length
}

/** Neulinge und Schwächere bekommen Leichteres, Starke werden gefordert. */
export function targetDifficulty(performance: number | null): Difficulty {
  if (performance === null) return 'easy'
  if (performance < 0.4) return 'easy'
  if (performance < 0.75) return 'medium'
  return 'hard'
}

interface Weights {
  roleTopics: string[]
  playedTopics: Set<string>
  target: Difficulty
}

/** Affinität eines Spiels zum Spieler. Höher ist besser; 0 heißt "kein Signal". */
export function scoreGame(game: Game, w: Weights): number {
  let score = 0

  if (game.topic && w.roleTopics.includes(game.topic)) score += 3
  if (game.topic && w.playedTopics.has(game.topic)) score += 2

  const difficulty = game.difficulty as Difficulty | null
  if (difficulty && difficulty in DIFFICULTY_RANK) {
    const distance = Math.abs(DIFFICULTY_RANK[difficulty] - DIFFICULTY_RANK[w.target])
    if (distance === 0) score += 2
    else if (distance === 1) score += 1
  }

  return score
}

/** FNV-1a. Deterministisch und stabil über Prozesse hinweg — Math.random wäre es nicht. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Wählt ein wöchentlich stabiles "Game of the Week" plus drei Alternativen.
 *
 * Bereits abgeschlossene Spiele fallen raus; hat der Spieler alles gespielt,
 * wird der volle Katalog wieder zugelassen (`replaying`), damit das Dashboard
 * nicht leer bleibt. Das Wochenspiel wird aus den bestbewerteten Kandidaten
 * über (playerId + ISO-Woche) gelost: pro Nutzer verschieden, innerhalb einer
 * Woche unverändert, wechselt montags.
 */
export function recommendGames(games: Game[], ctx: RecommendationContext): Recommendations {
  const playedIds = new Set(ctx.played.map(p => p.gameId))
  const unplayed = games.filter(g => !playedIds.has(g.id))
  const replaying = unplayed.length === 0 && games.length > 0
  const candidates = replaying ? games : unplayed

  if (candidates.length === 0) return { gameOfTheWeek: null, alsoLike: [], replaying: false }

  const playedTopics = new Set(
    ctx.played
      .map(p => games.find(g => g.id === p.gameId)?.topic)
      .filter((t): t is string => Boolean(t))
  )
  const weights: Weights = {
    roleTopics: ROLE_TOPIC_AFFINITY[ctx.role] ?? [],
    playedTopics,
    target: targetDifficulty(relativePerformance(ctx.played, games)),
  }

  const seed = `${ctx.playerId}:${isoWeekIndex(ctx.now)}`
  const rank = (list: Game[]) =>
    list
      .map(game => ({ game, affinity: scoreGame(game, weights), tiebreak: hash(`${seed}:${game.id}`) }))
      // Affinität schlägt Zufall; der Hash entscheidet nur bei Gleichstand, damit die
      // Reihenfolge bei jedem Render identisch ist (kein Flackern durch instabiles Sortieren).
      .sort((a, b) => b.affinity - a.affinity || a.tiebreak - b.tiebreak)

  const ranked = rank(candidates)

  // Aus dem Feld der (nahezu) besten Kandidaten losen, statt immer den Spitzenreiter
  // zu nehmen — sonst stünde bei unverändertem Katalog jede Woche dasselbe Spiel oben.
  const best = ranked[0].affinity
  const pool = ranked.filter(r => r.affinity >= best - 1)
  const pick = pool[hash(seed) % pool.length]

  // "Auch interessant" bevorzugt Ungespieltes, füllt aber mit bereits gespielten
  // Spielen auf — die drei Karten sollen auch stehen, wenn der Spieler fast alles
  // durch hat, sonst wirkt das Dashboard nach ein paar Wochen leer.
  const playedRanked = replaying ? [] : rank(games.filter(g => playedIds.has(g.id)))
  const alsoLike = [...ranked, ...playedRanked]
    .filter(r => r.game.id !== pick.game.id)
    .slice(0, 3)
    .map(r => r.game)

  return { gameOfTheWeek: pick.game, alsoLike, replaying }
}
