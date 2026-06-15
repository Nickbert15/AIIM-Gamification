'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import GenerateGameModal from '@/components/GenerateGameModal'

export default function AdminPage() {
  const [stats, setStats] = useState({ players: 0, scores: 0, games: 0, avgScore: 0 })
  const [recentScores, setRecentScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const [
        { count: players },
        { data: scores },
      ] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('scores').select('score, game_id, completed_at, players(display_name, role)').order('completed_at', { ascending: false }).limit(8),
      ])

      const scoreList = scores ?? []
      const uniqueGames = new Set(scoreList.map((s: any) => s.game_id)).size
      const avg = scoreList.length > 0
        ? Math.round(scoreList.reduce((s: number, r: any) => s + r.score, 0) / scoreList.length)
        : 0

      setStats({ players: players ?? 0, scores: scoreList.length, games: uniqueGames, avgScore: avg })
      setRecentScores(scoreList)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Spiel generieren
        </button>
      </div>
      <GenerateGameModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="stats-grid">
        {[
          { value: stats.players, label: 'Registrierte Spieler', accent: true },
          { value: stats.scores, label: 'Games gespielt', accent: false },
          { value: stats.games, label: 'Verschiedene Games', accent: false },
          { value: stats.avgScore, label: 'Ø Score', accent: true },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.accent ? 'stat-accent' : ''}`}>
            <div className="stat-value">{s.value.toLocaleString('de-DE')}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Letzte Aktivitäten</div>
        {loading ? (
          <div className="loading-spinner">Lade…</div>
        ) : recentScores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">Noch keine Scores vorhanden. <Link href="/admin/scores" style={{ color: 'var(--accent)' }}>Ersten Score eintragen →</Link></div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Spieler</th>
                  <th>Rolle</th>
                  <th>Game ID</th>
                  <th>Score</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {recentScores.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.players?.display_name ?? '—'}</td>
                    <td><span className="player-role">{s.players?.role ?? '—'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{s.game_id}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.score}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(s.completed_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
        {[
          { href: '/admin/players', label: '+ Spieler anlegen', icon: '👤' },
          { href: '/admin/scores', label: '+ Score eintragen', icon: '🏆' },
          { href: '/admin/games', label: '+ Game registrieren', icon: '🎮' },
        ].map((a) => (
          <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '20px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>{a.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
