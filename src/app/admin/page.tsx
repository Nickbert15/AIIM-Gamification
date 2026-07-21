'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Inbox, ArrowRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type TFn = (key: string, vars?: Record<string, string | number>) => string

function formatRelativeTime(iso: string, t: TFn): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return t('admin.time.now')
  if (minutes < 60) return t('admin.time.min', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('admin.time.hour', { n: hours })
  const days = Math.round(hours / 24)
  return days === 1 ? t('admin.time.day', { n: days }) : t('admin.time.days', { n: days })
}

export default function AdminPage() {
  const { t } = useI18n()
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
          { value: stats.players, label: t('admin.stat.players'), accent: true },
          { value: stats.scores, label: t('admin.stat.gamesPlayed'), accent: false },
          { value: stats.games, label: t('admin.stat.distinctGames'), accent: false },
          { value: stats.avgScore, label: t('admin.stat.avgScore'), accent: true },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.accent ? 'stat-accent' : ''}`}>
            <div className="stat-value">{s.value.toLocaleString('de-DE')}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">{t('admin.recentActivity')}</div>
        {loading ? (
          <div className="loading-spinner">{t('common.loading')}</div>
        ) : recentScores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={30} strokeWidth={1.5} /></div>
            <div className="empty-state-text">
              {t('admin.noScores')}{' '}
              <Link href="/admin/scores" className="empty-state-link">
                {t('admin.enterFirstScore')} <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="activity-list">
            {recentScores.map((s, i) => (
              <div key={i} className="activity-row">
                <span className="activity-icon"><CheckCircle2 size={16} strokeWidth={2} /></span>
                <span className="activity-text">
                  <strong>{s.players?.display_name ?? '—'}</strong> {t('admin.actCompletedMid')} <strong>{s.game_title ?? s.game_id}</strong>{t('admin.actCompletedEnd')}
                </span>
                <span className="activity-score">{s.score} {t('common.points_short')}</span>
                <span className="activity-time">{formatRelativeTime(s.completed_at, t)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
