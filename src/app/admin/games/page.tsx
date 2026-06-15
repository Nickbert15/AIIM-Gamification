'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// This page shows which game_ids have been played + lets you add notes/metadata
// Games themselves come from n8n – this is just the admin view of what's in the pool

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Aggregate played games from scores table
      const { data } = await supabase
        .from('scores')
        .select('game_id, score, player_id')
        .order('game_id')

      if (!data) { setLoading(false); return }

      // Group by game_id
      const grouped: Record<string, { count: number; scores: number[]; players: Set<string> }> = {}
      data.forEach((s: any) => {
        if (!grouped[s.game_id]) grouped[s.game_id] = { count: 0, scores: [], players: new Set() }
        grouped[s.game_id].count++
        grouped[s.game_id].scores.push(s.score)
        grouped[s.game_id].players.add(s.player_id)
      })

      const gameList = Object.entries(grouped).map(([id, g]) => ({
        game_id: id,
        plays: g.count,
        unique_players: g.players.size,
        avg_score: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
        max_score: Math.max(...g.scores),
      }))

      setGames(gameList.sort((a, b) => b.plays - a.plays))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div className="card-title">Game Pool — Info</div>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Games werden von der <strong style={{ color: 'var(--text)' }}>n8n Pipeline</strong> generiert und als JSON im Game Pool gespeichert.
          Diese Ansicht zeigt, welche Game-IDs bereits von Spielern absolviert wurden, mit Engagement-Statistiken.
          <br /><br />
          <span style={{ color: 'var(--text-muted)' }}>Game Pool in Supabase → Tabelle <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>game_pool</code> (wird von n8n befüllt).</span>
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>Gespielte Games ({games.length})</span>
        </div>
        {loading ? (
          <div className="loading-spinner">Lade…</div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <div className="empty-state-text">Noch keine Games gespielt. Trage einen ersten Score unter "Scores" ein.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Game ID</th>
                  <th>Gespielt</th>
                  <th>Unique Spieler</th>
                  <th>Ø Score</th>
                  <th>Max Score</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.game_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{g.game_id}</td>
                    <td>{g.plays}×</td>
                    <td style={{ color: 'var(--text-muted)' }}>{g.unique_players}</td>
                    <td style={{ color: 'var(--accent)' }}>{g.avg_score}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{g.max_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
