'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      setSubmitting(false)
      setError('E-Mail-Adresse oder Passwort ist falsch.')
      return
    }

    // Bewusst window.location statt useSearchParams: letzteres erzwingt eine
    // Suspense-Boundary beim Prerender.
    const next = new URLSearchParams(window.location.search).get('next')
    // "//evil.com" ist ein protokoll-relativer Redirect nach außen, kein interner Pfad.
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
    window.dispatchEvent(new Event('auth-changed'))
    router.replace(safeNext)
    router.refresh()
  }

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <div className="auth-icon">
          <Image src="/lufthansa-crane.svg" alt="" width={36} height={36} priority />
        </div>
        <h1 className="auth-title">AI Enablement</h1>
        <p className="auth-subtitle">Melde dich mit deinen Zugangsdaten an.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label htmlFor="email">E-Mail-Adresse</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="vorname.nachname@lhg.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Anmelden…' : 'Anmelden →'}
          </button>
        </form>

        <p className="auth-subtitle" style={{ marginTop: 20, marginBottom: 0, fontSize: 13 }}>
          Noch keine Zugangsdaten? Wende dich an das AI-Enablement-Team.
        </p>
      </div>
    </div>
  )
}
