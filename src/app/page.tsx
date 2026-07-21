'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { Gamepad2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Row = { rank: number; display_name: string; role: string; total_score: number; games_played: number }

export default function LeaderboardPage() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Aus der API (Service-Role) statt direkt aus der `leaderboard`-View: die
      // Route rechnet total_score (Summe) und games_played (Anzahl) verlässlich
      // aus der scores-Tabelle und umgeht RLS.
      const res = await fetch('/api/leaderboard', { cache: 'no-store' })
      const lb: Row[] = res.ok ? await res.json() : []
      if (cancelled) return
      setEntries(lb ?? [])
      setLoading(false)
    }
    load()

    // Realtime: update leaderboard live
    const channel = supabase
      .channel('scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  const rankDisplay = (rank: number, hasScore: boolean) => {
    if (!hasScore) return <span className="rank-badge rank-other" style={{ opacity: 0.4 }}>—</span>
    const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'
    return <span className={`rank-badge ${cls}`}>{rank}</span>
  }

  const playerCount = entries.length
  const withScores = entries.filter((e) => e.total_score > 0)
  const totalPoints = entries.reduce((s, e) => s + e.total_score, 0)
  const maxScore = withScores[0]?.total_score ?? 0
  const podium = withScores.slice(0, 3)


  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t('lb.title')}</h1>
        <p className="page-subtitle">{t('lb.subtitle')}</p>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile stat-tile-hero">
          <div className="stat-tile-label">{t('lb.totalPoints')}</div>
          <div className="stat-tile-value">{totalPoints.toLocaleString('de-DE')}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">{t('lb.participants')}</div>
          <div className="stat-tile-value">{playerCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label">{t('lb.alreadyPlayed')}</div>
          <div className="stat-tile-value">{withScores.length}</div>
        </div>
      </div>

      {!loading && podium.length > 0 && (
        <div className="podium">
          {podium.map((p) => (
            <div key={p.display_name} className={`podium-card podium-${p.rank}`}>
              <div className={`podium-medal rank-${p.rank}`}>{p.rank}</div>
              <Avatar name={p.display_name} size={56} />
              <div className="podium-name">{p.display_name}</div>
              <div className="player-role">{p.role}</div>
              <div className="podium-score">{p.total_score.toLocaleString('de-DE')}</div>
              <div className="podium-score-label">
                {p.games_played} {p.games_played === 1 ? t('lb.gameSingular') : t('lb.gamePlural')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="leaderboard-header">
          <span>{t('lb.colRank')}</span>
          <span>{t('lb.colName')}</span>
          <span>{t('lb.colGames')}</span>
          <span style={{ textAlign: 'right' }}>{t('lb.colPoints')}</span>
        </div>

        {loading ? (
          <div className="loading-spinner">{t('lb.loading')}</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Gamepad2 size={26} strokeWidth={1.5} /></div>
            <div className="empty-state-text">{t('lb.empty')}</div>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.display_name}
              className={`leaderboard-row${entry.total_score > 0 && entry.rank <= 3 ? ` leaderboard-top leaderboard-top-${entry.rank}` : ''}`}
              style={{ opacity: entry.total_score === 0 ? 0.55 : 1 }}
            >
              <div>{rankDisplay(entry.rank, entry.total_score > 0)}</div>
              <div className="leaderboard-player">
                <Avatar name={entry.display_name} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div className="player-name">{entry.display_name}</div>
                  <div className="player-role">{entry.role}</div>
                </div>
              </div>
              <div className="leaderboard-games">
                {entry.games_played > 0 ? entry.games_played : '—'}
              </div>
              <div>
                {entry.total_score > 0 ? (
                  <>
                    <div className="score-value">{entry.total_score.toLocaleString('de-DE')}</div>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${maxScore ? Math.max(4, (entry.total_score / maxScore) * 100) : 0}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="score-label" style={{ textAlign: 'right' }}>{t('lb.notPlayed')}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
