'use client'

import { useEffect, useState } from 'react'
import { supabase, Player } from '@/lib/supabase'

const ROLES = ['Controller', 'Finance Manager', 'Senior Controller', 'CFO', 'Analyst', 'Other']

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({ email: '', display_name: '', role: 'Controller' })

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false })
    setPlayers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [])

  async function handleAdd() {
    if (!form.email || !form.display_name) {
      setMsg({ type: 'error', text: 'Email und Anzeigename sind Pflichtfelder.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('players').insert([form])
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: `Spieler "${form.display_name}" wurde angelegt.` })
      setForm({ email: '', display_name: '', role: 'Controller' })
      loadPlayers()
    }
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Spieler "${name}" wirklich löschen? Alle zugehörigen Scores werden ebenfalls gelöscht.`)) return
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (!error) loadPlayers()
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Neuen Spieler anlegen</div>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label>E-Mail *</label>
            <input
              type="email"
              placeholder="sabrina.kaufmann@lhg.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Anzeigename *</label>
            <input
              type="text"
              placeholder="Sabrina K."
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Rolle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? 'Speichern…' : '+ Spieler anlegen'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>Alle Spieler ({players.length})</span>
        </div>
        {loading ? (
          <div className="loading-spinner">Lade…</div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">Noch keine Spieler angelegt.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Erstellt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.display_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.email}</td>
                    <td><span className="player-role">{p.role}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleDelete(p.id, p.display_name)}>
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
