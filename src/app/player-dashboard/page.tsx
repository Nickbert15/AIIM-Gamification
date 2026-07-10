'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '@/components/Avatar'
import GamePlayerModal from '@/components/GamePlayerModal'
import { recommendGames } from '@/lib/recommendations'
import { Game } from '@/types/game'

type Step = 'email' | 'set-password' | 'login'

type PlayerData = {
  player: { id: string; email: string; display_name: string; role: string }
  stats: { games_played: number; total_score: number; avg_score: number; best_score: number }
  history: { id: string; score: number; completed_at: string; games: { id: string; title: string } | null }[]
}

function gameKind(game: Game): { icon: string; label: string; count: string } {
  const questionCount = game.game_json?.questions?.length ?? 0
  if (questionCount > 0) {
    return {
      icon: '❓',
      label: 'Quiz',
      count: `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`,
    }
  }
  return { icon: '🎮', label: game.format ?? 'Spiel', count: '' }
}

function gameSubtitle(game: Game): string {
  return [gameKind(game).label, game.difficulty, game.topic].filter(Boolean).join(' · ')
}

export default function PlayerDashboardPage() {
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [activeGame, setActiveGame] = useState<Game | null>(null)

  // login form state
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    const r = await fetch('/api/auth/me')
    const me = r.ok ? await r.json() : null
    setData(me)
    setLoading(false)
    if (me) {
      const gr = await fetch('/api/games')
      if (gr.ok) setGames(await gr.json())
    } else {
      setGames([])
    }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('auth-changed', refresh)
    return () => window.removeEventListener('auth-changed', refresh)
  }, [refresh])

  // Deep-Link aus der Weekly-Mail: /player-dashboard?game=<gameId> öffnet das Spiel
  // automatisch, sobald Login UND Spieleliste da sind — der Link überlebt also auch
  // den Passwort-anlegen-Flow neuer Nutzer. Bewusst window.location statt
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/auth/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const body = await res.json()
    setSubmitting(false)

    if (!body.exists) { setError('Diese E-Mail-Adresse ist nicht registriert.'); return }
    setStep(body.hasPassword ? 'login' : 'set-password')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setSubmitting(false)

    if (!res.ok) { setError('Falsches Passwort. Bitte erneut versuchen.'); return }
    await refresh()
    window.dispatchEvent(new Event('auth-changed'))
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setSubmitting(false)

    if (!res.ok) { setError('Fehler beim Einrichten des Passworts.'); return }
    await refresh()
    window.dispatchEvent(new Event('auth-changed'))
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setData(null)
    setStep('email')
    setEmail('')
    setPassword('')
    setConfirm('')
    setError('')
    window.dispatchEvent(new Event('auth-changed'))
  }

  if (loading) return <div className="loading-spinner">Lade…</div>

  // ── Authenticated dashboard ──────────────────────────────────────────────
  if (data) {
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
          <button className="btn btn-ghost" onClick={handleLogout}>Abmelden</button>
        </div>

        <div className="stat-tiles">
          <div className="stat-tile stat-tile-hero">
            <div className="stat-tile-label">Gesamtpunkte</div>
            <div className="stat-tile-value">{stats.total_score.toLocaleString('de-DE')}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">Games gespielt</div>
            <div className="stat-tile-value">{stats.games_played}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">Bestes Ergebnis</div>
            <div className="stat-tile-value">{stats.best_score.toLocaleString('de-DE')}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">Ø Score</div>
            <div className="stat-tile-value">{Math.round(stats.avg_score).toLocaleString('de-DE')}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          {!recommendations?.gameOfTheWeek ? (
            <>
              <div className="card-title">Verfügbare Spiele</div>
              <div className="empty-state">
                <div className="empty-state-icon">🕹️</div>
                <div className="empty-state-text">Aktuell sind keine Spiele verfügbar. Schau später wieder vorbei!</div>
              </div>
            </>
          ) : (
            <>
              <div className="gotw-card">
                <span className="gotw-icon">{gameKind(recommendations.gameOfTheWeek).icon}</span>
                <div className="gotw-body">
                  <div className="gotw-eyebrow">Game of the Week</div>
                  <div className="gotw-title">{recommendations.gameOfTheWeek.title}</div>
                  <div className="gotw-meta">{gameSubtitle(recommendations.gameOfTheWeek)}</div>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveGame(recommendations.gameOfTheWeek!)}>
                  Jetzt spielen →
                </button>
              </div>

              {recommendations.replaying && (
                <div className="gotw-meta" style={{ marginTop: 12 }}>
                  Du hast schon alle Spiele abgeschlossen — Zeit für eine Wiederholung.
                </div>
              )}

              {recommendations.alsoLike.length > 0 && (
                <>
                  <div className="section-heading">Das könnte dir auch gefallen</div>
                  <div className="game-grid">
                    {recommendations.alsoLike.map((game) => {
                      const kind = gameKind(game)
                      return (
                        <div key={game.id} className="game-card">
                          <div className="game-card-top">
                            <span className="game-card-icon">{kind.icon}</span>
                            <div style={{ minWidth: 0 }}>
                              <div className="game-card-title">{game.title}</div>
                              <div className="game-card-meta">{gameSubtitle(game)}</div>
                            </div>
                          </div>
                          <div className="game-card-footer">
                            <span className="game-card-count">{kind.count}</span>
                            <button className="btn btn-primary" onClick={() => setActiveGame(game)}>
                              {playedIds.has(game.id) ? 'Nochmal spielen →' : 'Spielen →'}
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
          <div className="card-title">Meine Spiele</div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎮</div>
              <div className="empty-state-text">Noch keine Spiele — viel Erfolg beim ersten Game!</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Spiel</th>
                    <th>Score</th>
                    <th>Datum</th>
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
                          {isBest && <span className="best-badge">Best</span>}
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

  // ── Login / setup flow ───────────────────────────────────────────────────
  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <div className="auth-icon">🎮</div>
        <h1 className="auth-title">Player Dashboard</h1>
        <p className="auth-subtitle">
          {step === 'email' && 'Melde dich mit deiner E-Mail-Adresse an.'}
          {step === 'login' && 'Gib dein Passwort ein.'}
          {step === 'set-password' && 'Erstelle ein Passwort für deinen Account.'}
        </p>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label htmlFor="email">E-Mail-Adresse</label>
              <input
                id="email"
                type="email"
                placeholder="vorname.nachname@lhg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Prüfe…' : 'Weiter →'}
            </button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{email}</div>
            <div className="form-group">
              <label htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Anmelden…' : 'Anmelden →'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setStep('email'); setError('') }}>
              ← Andere E-Mail
            </button>
          </form>
        )}

        {step === 'set-password' && (
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{email}</div>
            <div className="alert alert-success" style={{ marginBottom: 0 }}>
              Willkommen! Lege jetzt dein Passwort fest.
            </div>
            <div className="form-group">
              <label htmlFor="password">Passwort (min. 8 Zeichen)</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm">Passwort bestätigen</label>
              <input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Speichern…' : 'Passwort festlegen →'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setStep('email'); setError('') }}>
              ← Zurück
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
