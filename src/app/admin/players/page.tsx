'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/lib/supabase'
import { Users, Wrench } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const ROLES = ['Controller', 'Finance Manager', 'Senior Controller', 'CFO', 'Analyst', 'Other']

const EMPTY_FORM = { email: '', display_name: '', role: 'Controller', password: '', is_admin: false }

export default function PlayersPage() {
  const { t } = useI18n()
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
      flash('error', t('admin.players.required'))
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
      flash('error', (await res.json()).error ?? t('admin.players.createFailed'))
      return
    }
    flash('success', t('admin.players.created', { name: form.display_name }))
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
      flash('error', (await res.json()).error ?? t('admin.players.changeFailed'))
      return
    }
    flash('success', successText)
    loadPlayers()
  }

  function handleResetPassword(p: Player) {
    const password = prompt(t('admin.players.resetPrompt', { name: p.display_name }))
    if (!password) return
    patchPlayer(p.id, { password }, t('admin.players.passwordSet', { name: p.display_name }))
  }

  function handleToggleAdmin(p: Player) {
    const next = !p.is_admin
    const verb = next ? t('admin.players.makeAdmin') : t('admin.players.revokeAdmin')
    if (!confirm(t('admin.players.confirmToggle', { name: p.display_name, verb }))) return
    const role = next ? t('admin.players.roleAdmin') : t('admin.players.roleUser')
    patchPlayer(p.id, { is_admin: next }, t('admin.players.nowRole', { name: p.display_name, role }))
  }

  async function handleDelete(p: Player) {
    if (!confirm(t('admin.players.confirmDelete', { name: p.display_name }))) return
    const res = await fetch(`/api/admin/players?id=${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      flash('error', (await res.json()).error ?? t('admin.players.deleteFailed'))
      return
    }
    loadPlayers()
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">{t('admin.players.createTitle')}</div>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label>{t('admin.players.email')}</label>
            <input
              type="email"
              placeholder="sabrina.kaufmann@lhg.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.players.displayName')}</label>
            <input
              type="text"
              placeholder="Sabrina K."
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.players.role')}</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('admin.players.password')}</label>
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
          <span>{t('admin.players.adminCheckbox')}</span>
        </label>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? t('common.saving') : t('admin.players.addBtn')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>{t('admin.players.allTitle', { n: players.length })}</span>
        </div>
        {loading ? (
          <div className="loading-spinner">{t('common.loading')}</div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={26} strokeWidth={1.5} /></div>
            <div className="empty-state-text">{t('admin.players.empty')}</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.players.colName')}</th>
                  <th>{t('admin.players.colEmail')}</th>
                  <th>{t('admin.players.colRole')}</th>
                  <th>{t('admin.players.colAdmin')}</th>
                  <th>{t('admin.players.colCreated')}</th>
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
                        {p.is_admin ? <><Wrench size={12} strokeWidth={2.25} style={{ marginRight: 4, verticalAlign: -1 }} />{t('admin.players.badgeAdmin')}</> : t('admin.players.badgeUser')}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleResetPassword(p)}>
                          {t('admin.players.btnPassword')}
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(p)}>
                          {t('admin.delete')}
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
