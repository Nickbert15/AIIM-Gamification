'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

export default function ScoresPage() {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const res = await fetch('/api/admin/scores')
    setScores(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Score wirklich löschen?')) return
    const res = await fetch(`/api/admin/scores?id=${id}`, { method: 'DELETE' })
    if (res.ok) loadAll()
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="card-title" style={{ margin: 0 }}>Letzte 50 Scores</span>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Scores entstehen automatisch beim Spielen. Hier kannst du sie einsehen und einzelne Einträge (z.&nbsp;B. Tests) entfernen.
        </p>
      </div>
      {loading ? (
        <div className="loading-spinner">Lade…</div>
      ) : scores.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Trophy size={26} strokeWidth={1.5} /></div>
          <div className="empty-state-text">Noch keine Scores vorhanden.</div>
        </div>
      ) : (
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Spieler</th>
                <th>Game ID</th>
                <th>Score</th>
                <th>Datum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.players?.display_name ?? '—'}</div>
                    <div><span className="player-role">{s.players?.role ?? '—'}</span></div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{s.game_id}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{s.score}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {new Date(s.completed_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => handleDelete(s.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
