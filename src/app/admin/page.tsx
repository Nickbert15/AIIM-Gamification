'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import GenerateGameModal from '@/components/GenerateGameModal'
import { CheckCircle2, Inbox, ArrowRight, UserPlus, Trophy, Gamepad2 } from 'lucide-react'

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

// Demo-Daten zum lokalen Testen ohne echte Supabase-Anbindung (greift nur,
// wenn die echte Abfrage leer zurückkommt). Vor dem Merge nach main wieder entfernen.
const DEMO_STATS = { players: 128, scores: 642, games: 2, avgScore: 285 }
const DEMO_RECENT_SCORES = [
  { score: 340, game_id: 'demo-hallucination-spotter-v2', completed_at: new Date(Date.now() - 2 * 60000).toISOString(), players: { display_name: 'M. Kessler', role: 'Controller' } },
  { score: 210, game_id: 'demo-prompt-arena', completed_at: new Date(Date.now() - 8 * 60000).toISOString(), players: { display_name: 'A. Novak', role: 'Finance Manager' } },
  { score: 410, game_id: 'demo-hallucination-spotter-v2', completed_at: new Date(Date.now() - 21 * 60000).toISOString(), players: { display_name: 'L. Braun', role: 'Analyst' } },
  { score: 180, game_id: 'demo-prompt-arena', completed_at: new Date(Date.now() - 55 * 60000).toISOString(), players: { display_name: 'S. Rossi', role: 'CFO' } },
]

export default function AdminPage() {
  const [stats, setStats] = useState({ players: 0, scores: 0, games: 0, avgScore: 0 })
  const [recentScores, setRecentScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Local dev often points at a placeholder Supabase project (see
      // .env.local.example) whose DNS never resolves - the client then hangs
      // instead of rejecting quickly. Racing it against a timeout means the
      // demo fallback below still kicks in so the dashboard is testable
      // without a real backend, while a real, reachable Supabase project
      // (production) always resolves long before this fires.
      const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 4000))
      const fetchPromise = Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('scores').select('score, game_id, completed_at, players(display_name, role)').order('completed_at', { ascending: false }).limit(8),
      ])

      const result = await Promise.race([fetchPromise, timeout])
      if (cancelled) return

      if (result === 'timeout') {
        setStats(DEMO_STATS)
        setRecentScores(DEMO_RECENT_SCORES)
        setLoading(false)
        return
      }

      const [{ count: players }, { data: scores }] = result
      const scoreList = scores ?? []

      if (scoreList.length === 0) {
        setStats(DEMO_STATS)
        setRecentScores(DEMO_RECENT_SCORES)
        setLoading(false)
        return
      }

      const uniqueGames = new Set(scoreList.map((s: any) => s.game_id)).size
      const avg = Math.round(scoreList.reduce((s: number, r: any) => s + r.score, 0) / scoreList.length)

      setStats({ players: players ?? 0, scores: scoreList.length, games: uniqueGames, avgScore: avg })
      setRecentScores(scoreList)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
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
                  <strong>{s.players?.display_name ?? '—'}</strong> hat <strong>{s.game_id}</strong> abgeschlossen
                </span>
                <span className="activity-score">{s.score} Pkt.</span>
                <span className="activity-time">{formatRelativeTime(s.completed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="quick-actions-grid">
        {[
          { href: '/admin/players', label: 'Spieler anlegen', icon: UserPlus },
          { href: '/admin/scores', label: 'Score eintragen', icon: Trophy },
          { href: '/admin/games', label: 'Game registrieren', icon: Gamepad2 },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="quick-action-card">
            <span className="quick-action-icon"><a.icon size={20} strokeWidth={2} /></span>
            <span className="quick-action-label">{a.label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
