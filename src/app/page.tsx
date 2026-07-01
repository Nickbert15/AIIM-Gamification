'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = { rank: number; display_name: string; role: string; total_score: number }

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/leaderboard')
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const rankDisplay = (rank: number, hasScore: boolean) => {
    if (!hasScore) return <span className="rank-badge rank-other" style={{ opacity: 0.4 }}>—</span>
    if (rank === 1) return <span className="rank-badge rank-1">🥇</span>
    if (rank === 2) return <span className="rank-badge rank-2">🥈</span>
    if (rank === 3) return <span className="rank-badge rank-3">🥉</span>
    return <span className="rank-badge rank-other">#{rank}</span>
  }

  const playerCount = entries.length
  const withScores = entries.filter((e) => e.total_score > 0)
  const totalPoints = entries.reduce((s, e) => s + e.total_score, 0)

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">LHG Finance & Controlling — AI Enablement Pilot</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-accent">
          <div className="stat-value">{playerCount}</div>
          <div className="stat-label">Teilnehmer</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{withScores.length}</div>
          <div className="stat-label">Bereits gespielt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalPoints.toLocaleString('de-DE')}</div>
          <div className="stat-label">Gesamtpunkte vergeben</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="leaderboard-header">
          <span>Rang</span>
          <span>Name</span>
          <span>Rolle</span>
          <span style={{ textAlign: 'right' }}>Punkte</span>
        </div>

        {loading ? (
          <div className="loading-spinner">Lade Leaderboard…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <div className="empty-state-text">Noch keine Spieler registriert.</div>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.display_name} className="leaderboard-row" style={{ opacity: entry.total_score === 0 ? 0.55 : 1 }}>
              <div>{rankDisplay(entry.rank, entry.total_score > 0)}</div>
              <div>
                <div className="player-name">{entry.display_name}</div>
                <div className="player-role">{entry.role}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{entry.role}</div>
              <div>
                {entry.total_score > 0 ? (
                  <>
                    <div className="score-value">{entry.total_score.toLocaleString('de-DE')}</div>
                    <div className="score-label">Punkte</div>
                  </>
                ) : (
                  <div className="score-label" style={{ textAlign: 'right' }}>Noch nicht gespielt</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
