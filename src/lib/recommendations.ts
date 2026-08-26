import { Game } from '@/types/game'
import { isoWeekIndex } from './gamification'

export type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Role -> topics that are a natural professional fit. Deliberately kept in
 * code rather than the DB: `games.target_role` isn't populated meaningfully
 * by any generator (hardcoded to 'Financial Analyst' or null), so it doesn't
 * work as a matching key. Roles come from admin/players, topics from
 * GenerateGameModal.
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
  /** true when the player has already played everything and replays are being shown. */
  replaying: boolean
}

/** Achievable point total for a game — needed to make raw scores comparable. */
function maxPointsOf(game: Game): number {
  const declared = game.game_json?.scoring?.maxPoints
  if (typeof declared === 'number' && declared > 0) return declared
  const questions = game.game_json?.questions?.length ?? 0
  if (questions > 0) return questions * 10 // QUIZ_POINTS_PER_CORRECT
  return 100
}

/**
 * Average relative performance (0..1) across all played games that are still
 * in the catalog. `null` when there's no usable history.
 * Deliberately normalized against each game's maxPoints — the raw score from
 * `scores` isn't comparable between quiz and Excel Challenge.
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

/** Newcomers and weaker performers get easier games, strong performers get challenged. */
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

/** A game's affinity to the player. Higher is better; 0 means "no signal". */
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

/** FNV-1a. Deterministic and stable across processes — Math.random wouldn't be. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Picks a weekly-stable "Game of the Week" plus three alternatives.
 *
 * Already-completed games are excluded; once the player has played
 * everything, the full catalog is allowed again (`replaying`) so the
 * dashboard doesn't stay empty. The game of the week is drawn from the
 * top-scoring candidates using (playerId + ISO week): different per user,
 * unchanged within a week, rotates on Mondays.
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
      // Affinity beats randomness; the hash only breaks ties, so the order
      // stays identical across renders (no flicker from unstable sorting).
      .sort((a, b) => b.affinity - a.affinity || a.tiebreak - b.tiebreak)

  const ranked = rank(candidates)

  // An admin pin overrides the draw: a game marked "game of the week" is
  // shown globally to all players — regardless of affinity or played status.
  const pinned = games.find(g => g.is_gotw) ?? null

  // Without a pin: draw from the pool of (near-)best candidates instead of
  // always picking the top scorer — otherwise the same game would end up on
  // top every week for an unchanged catalog.
  const best = ranked[0].affinity
  const pool = ranked.filter(r => r.affinity >= best - 1)
  const pick = pinned ? { game: pinned } : pool[hash(seed) % pool.length]

  // "Also interesting" favors unplayed games but backfills with already-played
  // games — the three cards should still show up even when the player has
  // gone through almost everything, otherwise the dashboard looks empty after
  // a few weeks.
  const playedRanked = replaying ? [] : rank(games.filter(g => playedIds.has(g.id)))
  const alsoLike = [...ranked, ...playedRanked]
    .filter(r => r.game.id !== pick.game.id)
    .slice(0, 3)
    .map(r => r.game)

  return { gameOfTheWeek: pick.game, alsoLike, replaying }
}
