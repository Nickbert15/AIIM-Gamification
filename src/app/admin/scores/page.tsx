'use client'

import { useEffect, useState } from 'react'
import { supabase, Player, Score } from '@/lib/supabase'

export default function ScoresPage() {
  const [scores, setScores] = useState<any[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({ player_id: '', game_id: '', score: '' })

  async function loadAll() {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase
        .from('scores')
        .select('*, players(display_name, role)')
        .order('completed_at', { ascending: false })
        .limit(50),
      supabase.from('players').select('*').order('display_name'),
    ])
    setScores(s ?? [])
    setPlayers(p ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleAdd() {
    if (!form.player_id || !form.game_id || !form.score) {
      setMsg({ type: 'error', text: 'Alle Felder sind Pflichtfelder.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('scores').insert([{
      player_id: form.player_id,
      game_id: form.game_id,
      score: parseInt(form.score),
    }])
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Score eingetragen.' })
      setForm({ player_id: '', game_id: '', score: '' })
      loadAll()
    }
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Score wirklich löschen?')) return
    const { error } = await supabase.from('scores').delete().eq('id', id)
    if (!error) loadAll()
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Score manuell eintragen</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Im PoC kannst du Scores hier manuell eintragen. Sobald n8n läuft, schreibt die Pipeline direkt via API.
        </p>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label>Spieler *</label>
            <select value={form.player_id} onChange={(e) => setForm({ ...form, player_id: e.target.value })}>
              <option value="">— Spieler wählen —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name} ({p.role})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Game ID *</label>
            <input
              type="text"
              placeholder="z.B. quiz_prompt_basics_001"
              value={form.game_id}
              onChange={(e) => setForm({ ...form, game_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Score (Punkte) *</label>
            <input
              type="number"
              placeholder="z.B. 850"
              min={0}
              max={1000}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? 'Speichern…' : '+ Score eintragen'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>Letzte 50 Scores</span>
        </div>
        {loading ? (
          <div className="loading-spinner">Lade…</div>
        ) : scores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
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
    </>
  )
}
