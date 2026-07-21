'use client'

import { useEffect, useMemo, useState } from 'react'
import { Frown, Meh, Smile, MessageSquare, LucideIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type FeedbackRow = {
  id: string
  game_id: string
  game_title: string | null
  game_type: string
  rating: number
  comment: string | null
  created_at: string
  players: { display_name: string; role: string } | null
}

type TypeBreakdown = {
  type: string
  counts: Record<number, number>
  total: number
  avg: number
}

const RATING_META: Record<number, { labelKey: string; Icon: LucideIcon; color: string }> = {
  1: { labelKey: 'gpl.fbR1', Icon: Frown, color: 'var(--danger)' },
  2: { labelKey: 'gpl.fbR2', Icon: Meh, color: 'var(--accent)' },
  3: { labelKey: 'gpl.fbR3', Icon: Smile, color: 'var(--success-ink)' },
}

export default function FeedbackPage() {
  const { t } = useI18n()
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/feedback')
        if (!res.ok) throw new Error(t('admin.feedback.loadFailed'))
        const data = await res.json()
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('admin.feedback.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 } as Record<number, number>
    let sum = 0
    for (const r of rows) {
      counts[r.rating] = (counts[r.rating] ?? 0) + 1
      sum += r.rating
    }
    const avg = rows.length ? sum / rows.length : 0
    return { counts, avg, total: rows.length }
  }, [rows])

  const byType = useMemo<TypeBreakdown[]>(() => {
    const map = new Map<string, { type: string; counts: Record<number, number>; total: number; sum: number }>()
    for (const r of rows) {
      const key = r.game_type || t('admin.feedback.unknown')
      const entry = map.get(key) ?? { type: key, counts: { 1: 0, 2: 0, 3: 0 }, total: 0, sum: 0 }
      entry.counts[r.rating] = (entry.counts[r.rating] ?? 0) + 1
      entry.total += 1
      entry.sum += r.rating
      map.set(key, entry)
    }
    return Array.from(map.values())
      .map((e) => ({ type: e.type, counts: e.counts, total: e.total, avg: e.total ? e.sum / e.total : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [rows, t])

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card stat-accent">
          <div className="stat-value">{summary.total.toLocaleString('de-DE')}</div>
          <div className="stat-label">{t('admin.feedback.totalRatings')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.total ? summary.avg.toFixed(1) : '—'}</div>
          <div className="stat-label">{t('admin.feedback.avgRating')}</div>
        </div>
        {[3, 2, 1].map((level) => {
          const { labelKey, Icon, color } = RATING_META[level]
          return (
            <div key={level} className="stat-card">
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
                <Icon size={22} strokeWidth={2} /> {summary.counts[level] ?? 0}
              </div>
              <div className="stat-label">{t(labelKey)}</div>
            </div>
          )
        })}
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span className="card-title" style={{ margin: 0 }}>{t('admin.feedback.byTypeTitle')}</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.feedback.colType')}</th>
                  <th>{t('admin.feedback.colAvg')}</th>
                  <th style={{ minWidth: 120 }}>{t('admin.feedback.colDistribution')}</th>
                  {[3, 2, 1].map((level) => {
                    const { labelKey, Icon, color } = RATING_META[level]
                    return (
                      <th key={level} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color }}>
                          <Icon size={15} strokeWidth={2} /> {t(labelKey)}
                        </span>
                      </th>
                    )
                  })}
                  <th style={{ textAlign: 'right' }}>{t('admin.feedback.colTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((row) => (
                  <tr key={row.type}>
                    <td style={{ fontWeight: 600 }}>{row.type}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.avg.toFixed(1)}</td>
                    <td>
                      <div
                        style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-sunken)', minWidth: 90 }}
                        title={`${row.counts[3] ?? 0} ${t('gpl.fbR3')} · ${row.counts[2] ?? 0} ${t('gpl.fbR2')} · ${row.counts[1] ?? 0} ${t('gpl.fbR1')}`}
                      >
                        {(row.counts[3] ?? 0) > 0 && <span style={{ flex: row.counts[3], background: 'var(--success)' }} />}
                        {(row.counts[2] ?? 0) > 0 && <span style={{ flex: row.counts[2], background: 'var(--accent)' }} />}
                        {(row.counts[1] ?? 0) > 0 && <span style={{ flex: row.counts[1], background: 'var(--danger)' }} />}
                      </div>
                    </td>
                    {[3, 2, 1].map((level) => (
                      <td key={level} style={{ textAlign: 'center', color: RATING_META[level].color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {row.counts[level] ?? 0}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>{t('admin.feedback.title')}</span>
        </div>

        {loading ? (
          <div className="loading-spinner">{t('common.loading')}</div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-text">{error}</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MessageSquare size={26} strokeWidth={1.5} /></div>
            <div className="empty-state-text">{t('admin.feedback.empty')}</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.feedback.colRating')}</th>
                  <th>{t('admin.feedback.colType')}</th>
                  <th>{t('admin.feedback.colGame')}</th>
                  <th>{t('admin.feedback.colComment')}</th>
                  <th>{t('admin.scores.colPlayer')}</th>
                  <th>{t('admin.scores.colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = RATING_META[r.rating] ?? RATING_META[2]
                  const RatingIcon = meta.Icon
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: meta.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <RatingIcon size={18} strokeWidth={2} /> {t(meta.labelKey)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 13, whiteSpace: 'nowrap' }}>{r.game_type}</td>
                      <td style={{ fontWeight: 500 }}>
                        {r.game_title ?? <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.game_id}</span>}
                      </td>
                      <td style={{ maxWidth: 340, color: r.comment ? 'var(--text)' : 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                        {r.comment ?? '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.players?.display_name ?? '—'}</div>
                        {r.players?.role && <div><span className="player-role">{r.players.role}</span></div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
