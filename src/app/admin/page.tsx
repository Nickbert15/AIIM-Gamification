'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Inbox, ArrowRight } from 'lucide-react'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.round(hours / 24)
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}

export default function AdminPage() {
  const [stats, setStats] = useState({ players: 0, scores: 0, games: 0, avgScore: 0 })
  const [recentScores, setRecentScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const res = await fetch('/api/admin/stats')
      if (cancelled) return
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      if (cancelled) return

      setStats({
        players: data.players ?? 0,
        scores: data.gamesPlayed ?? 0,
        games: data.distinctGames ?? 0,
        avgScore: data.avgScore ?? 0,
      })
      setRecentScores(data.recent ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
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
            <div className="empty-state-icon"><Inbox size={30} strokeWidth={1.5} /></div>
            <div className="empty-state-text">
              Noch keine Scores vorhanden.{' '}
              <Link href="/admin/scores" className="empty-state-link">
                Ersten Score eintragen <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="activity-list">
            {recentScores.map((s, i) => (
              <div key={i} className="activity-row">
                <span className="activity-icon"><CheckCircle2 size={16} strokeWidth={2} /></span>
                <span className="activity-text">
                  <strong>{s.players?.display_name ?? '—'}</strong> hat <strong>{s.game_title ?? s.game_id}</strong> abgeschlossen
                </span>
                <span className="activity-score">{s.score} Pkt.</span>
                <span className="activity-time">{formatRelativeTime(s.completed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
