'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/lib/supabase'

const ROLES = ['Controller', 'Finance Manager', 'Senior Controller', 'CFO', 'Analyst', 'Other']

const EMPTY_FORM = { email: '', display_name: '', role: 'Controller', password: '', is_admin: false }

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function loadPlayers() {
    const res = await fetch('/api/admin/players')
    setPlayers(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [])

  async function handleAdd() {
    if (!form.email || !form.display_name || !form.password) {
      flash('error', 'E-Mail, Anzeigename und Passwort sind Pflichtfelder.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)

    if (!res.ok) {
      flash('error', (await res.json()).error ?? 'Spieler konnte nicht angelegt werden.')
      return
    }
    flash('success', `Spieler "${form.display_name}" wurde angelegt.`)
    setForm(EMPTY_FORM)
    loadPlayers()
  }

  async function patchPlayer(id: string, patch: { password?: string; is_admin?: boolean }, successText: string) {
    const res = await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) {
      flash('error', (await res.json()).error ?? 'Änderung fehlgeschlagen.')
      return
    }
    flash('success', successText)
    loadPlayers()
  }

  function handleResetPassword(p: Player) {
    const password = prompt(`Neues Passwort für "${p.display_name}" (min. 8 Zeichen):`)
    if (!password) return
    patchPlayer(p.id, { password }, `Passwort für "${p.display_name}" wurde gesetzt.`)
  }

  function handleToggleAdmin(p: Player) {
    const next = !p.is_admin
    const verb = next ? 'zum Admin machen' : 'die Admin-Rolle entziehen'
    if (!confirm(`"${p.display_name}" wirklich ${verb}?`)) return
    patchPlayer(p.id, { is_admin: next }, `"${p.display_name}" ist jetzt ${next ? 'Admin' : 'normaler Nutzer'}.`)
  }

  async function handleDelete(p: Player) {
    if (!confirm(`Spieler "${p.display_name}" wirklich löschen? Alle zugehörigen Scores werden ebenfalls gelöscht.`)) return
    const res = await fetch(`/api/admin/players?id=${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      flash('error', (await res.json()).error ?? 'Löschen fehlgeschlagen.')
      return
    }
    loadPlayers()
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
          <div className="form-group">
            <label>Passwort * (min. 8 Zeichen)</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
          />
          <span>Admin — darf das Admin-Dashboard sehen</span>
        </label>
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
                  <th>Admin</th>
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
                    <td>
                      <button
                        className={`btn ${p.is_admin ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleToggleAdmin(p)}
                      >
                        {p.is_admin ? '🛠️ Admin' : 'Nutzer'}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleResetPassword(p)}>
                          Passwort
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(p)}>
                          Löschen
                        </button>
                      </div>
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
