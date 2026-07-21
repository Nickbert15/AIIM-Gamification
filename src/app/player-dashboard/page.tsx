'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import GamePlayerModal from '@/components/GamePlayerModal'
import { recommendGames } from '@/lib/recommendations'
import { Game } from '@/types/game'
import { HelpCircle, Gamepad2, LucideIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type TFn = (key: string, vars?: Record<string, string | number>) => string

type PlayerData = {
  player: { id: string; email: string; display_name: string; role: string; is_admin: boolean }
  stats: { games_played: number; total_score: number; avg_score: number; best_score: number }
  history: { id: string; score: number; completed_at: string; games: { id: string; title: string } | null }[]
}

function gameKind(game: Game, t: TFn): { icon: LucideIcon; label: string; count: string } {
  const questionCount = game.game_json?.questions?.length ?? 0
  if (questionCount > 0) {
    return {
      icon: HelpCircle,
      label: t('dash.quiz'),
      count: `${questionCount} ${questionCount === 1 ? t('dash.frage') : t('dash.fragen')}`,
    }
  }
  return { icon: Gamepad2, label: game.format ?? t('dash.kindGame'), count: '' }
}

function gameSubtitle(game: Game, t: TFn): string {
  return [gameKind(game, t).label, game.difficulty, game.topic].filter(Boolean).join(' · ')
}

export default function PlayerDashboardPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [activeGame, setActiveGame] = useState<Game | null>(null)

  const refresh = useCallback(async () => {
    const r = await fetch('/api/auth/me')
    if (r.status === 401) {
      router.replace('/login?next=/player-dashboard')
      return
    }
    setData(r.ok ? await r.json() : null)
    setLoading(false)

    const gr = await fetch('/api/games')
    if (gr.ok) setGames(await gr.json())
  }, [router])

  useEffect(() => {
    refresh()
    window.addEventListener('auth-changed', refresh)
    return () => window.removeEventListener('auth-changed', refresh)
  }, [refresh])

  // Deep-Link aus der Weekly-Mail: /player-dashboard?game=<gameId> öffnet das Spiel
  // automatisch, sobald Login UND Spieleliste da sind. Bewusst window.location statt
  // useSearchParams: letzteres erzwingt eine Suspense-Boundary beim Prerender.
  const [deepLinkDone, setDeepLinkDone] = useState(false)
  useEffect(() => {
    if (deepLinkDone || !data || games.length === 0) return
    setDeepLinkDone(true)
    const wanted = new URLSearchParams(window.location.search).get('game')
    if (!wanted) return
    const match = games.find((g) => g.id === wanted)
    if (match) setActiveGame(match)
  }, [deepLinkDone, data, games])

  const playedIds = useMemo(
    () => new Set(data?.history.flatMap(h => (h.games ? [h.games.id] : [])) ?? []),
    [data]
  )

  const recommendations = useMemo(() => {
    if (!data) return null
    const played = data.history.flatMap(h => (h.games ? [{ gameId: h.games.id, score: h.score }] : []))
    return recommendGames(games, {
      playerId: data.player.id,
      role: data.player.role,
      played,
      now: new Date(),
    })
  }, [data, games])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.dispatchEvent(new Event('auth-changed'))
    router.replace('/login')
    router.refresh()
  }

  if (loading || !data) return <div className="loading-spinner">{t('common.loading')}</div>

  const GotwIcon = recommendations?.gameOfTheWeek ? gameKind(recommendations.gameOfTheWeek, t).icon : Gamepad2

  const { player, stats, history } = data

  return (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-hero-identity">
          <Avatar name={player.display_name} size={64} />
          <div>
            <h1 className="page-title">{player.display_name}</h1>
            <div className="dashboard-hero-meta">
              <span className="player-role">{player.role}</span>
              <span className="dashboard-hero-email">{player.email}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout}>{t('dash.logout')}</button>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile stat-tile-hero">
          <div className="stat-tile-label">{t('dash.totalPoints')}</div>
          <div className="stat-tile-value">{stats.total_score.toLocaleString('de-DE')}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">{t('dash.gamesPlayed')}</div>
          <div className="stat-tile-value">{stats.games_played}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">{t('dash.bestScore')}</div>
          <div className="stat-tile-value">{stats.best_score.toLocaleString('de-DE')}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">{t('dash.avgScore')}</div>
          <div className="stat-tile-value">{Math.round(stats.avg_score).toLocaleString('de-DE')}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {!recommendations?.gameOfTheWeek ? (
          <>
            <div className="card-title">{t('dash.availableGames')}</div>
            <div className="empty-state">
              <div className="empty-state-icon"><Gamepad2 size={26} strokeWidth={1.5} /></div>
              <div className="empty-state-text">{t('dash.noGames')}</div>
            </div>
          </>
        ) : (
          <>
            <div className="gotw-card">
              <span className="gotw-icon"><GotwIcon size={28} strokeWidth={1.75} /></span>
              <div className="gotw-body">
                <div className="gotw-eyebrow">{t('dash.gameOfTheWeek')}</div>
                <div className="gotw-title">{recommendations.gameOfTheWeek.title}</div>
                <div className="gotw-meta">{gameSubtitle(recommendations.gameOfTheWeek, t)}</div>
              </div>
              <button className="btn btn-primary" onClick={() => setActiveGame(recommendations.gameOfTheWeek!)}>
                {t('dash.playNow')}
              </button>
            </div>

            {recommendations.replaying && (
              <div className="gotw-meta" style={{ marginTop: 12 }}>
                {t('dash.replaying')}
              </div>
            )}

            {recommendations.alsoLike.length > 0 && (
              <>
                <div className="section-heading">{t('dash.alsoLike')}</div>
                <div className="game-grid">
                  {recommendations.alsoLike.map((game) => {
                    const kind = gameKind(game, t)
                    const KindIcon = kind.icon
                    return (
                      <div key={game.id} className="game-card">
                        <div className="game-card-top">
                          <span className="game-card-icon"><KindIcon size={20} strokeWidth={1.75} /></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="game-card-title">{game.title}</div>
                            <div className="game-card-meta">{gameSubtitle(game, t)}</div>
                          </div>
                        </div>
                        <div className="game-card-footer">
                          <span className="game-card-count">{kind.count}</span>
                          <button className="btn btn-primary" onClick={() => setActiveGame(game)}>
                            {playedIds.has(game.id) ? t('dash.playAgain') : t('dash.play')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">{t('dash.myGames')}</div>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Gamepad2 size={26} strokeWidth={1.5} /></div>
            <div className="empty-state-text">{t('dash.noHistory')}</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('dash.colGame')}</th>
                  <th>{t('dash.colScore')}</th>
                  <th>{t('dash.colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => {
                  const isBest = stats.best_score > 0 && s.score === stats.best_score
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{s.games?.title ?? '—'}</td>
                      <td className="history-score">
                        {s.score.toLocaleString('de-DE')}
                        {isBest && <span className="best-badge">{t('dash.best')}</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(s.completed_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeGame && (
        <GamePlayerModal
          key={activeGame.id}
          game={activeGame}
          playerId={player.id}
          onClose={() => setActiveGame(null)}
          onSaved={refresh}
        />
      )}
    </>
  )
}
