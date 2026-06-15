'use client'

import { useEffect, useState } from 'react'
import { supabase, LeaderboardEntry, Player, Score } from '@/lib/supabase'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerCount, setPlayerCount] = useState(0)
  const [gameCount, setGameCount] = useState(0)
  const [totalScores, setTotalScores] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: lb }, { count: players }, { data: scores }] = await Promise.all([
        supabase.from('leaderboard').select('*').order('rank'),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('scores').select('score, game_id'),
      ])

      setEntries(lb ?? [])
      setPlayerCount(players ?? 0)
      if (scores) {
        const uniqueGames = new Set(scores.map((s: any) => s.game_id)).size
        setGameCount(uniqueGames)
        setTotalScores(scores.reduce((sum: number, s: any) => sum + s.score, 0))
      }
      setLoading(false)
    }
    load()

    // Realtime: update leaderboard live
    const channel = supabase
      .channel('scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const rankDisplay = (rank: number) => {
    if (rank === 1) return <span className="rank-badge rank-1">🥇</span>
    if (rank === 2) return <span className="rank-badge rank-2">🥈</span>
    if (rank === 3) return <span className="rank-badge rank-3">🥉</span>
    return <span className="rank-badge rank-other">#{rank}</span>
  }

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
          <div className="stat-value">{gameCount}</div>
          <div className="stat-label">Verschiedene Games</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalScores.toLocaleString('de-DE')}</div>
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
            <div className="empty-state-text">Noch keine Scores — first one to play wins!</div>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.rank} className="leaderboard-row">
              <div>{rankDisplay(entry.rank)}</div>
              <div>
                <div className="player-name">{entry.display_name}</div>
                <div className="player-role">{entry.role}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{entry.role}</div>
              <div>
                <div className="score-value">{entry.total_score.toLocaleString('de-DE')}</div>
                <div className="score-label">Punkte</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
