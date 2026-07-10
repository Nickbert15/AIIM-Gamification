'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Avatar from './Avatar'

type Player = { display_name: string; email: string; role: string; is_admin: boolean }

export default function NavBar() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const loadMe = useCallback(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlayer(d?.player ?? null))
      .catch(() => setPlayer(null))
  }, [])

  useEffect(() => {
    loadMe()
    window.addEventListener('auth-changed', loadMe)
    return () => window.removeEventListener('auth-changed', loadMe)
  }, [loadMe])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setPlayer(null)
    setOpen(false)
    window.dispatchEvent(new Event('auth-changed'))
    router.replace('/login')
    router.refresh()
  }

  const linkClass = (href: string) => `nav-link${pathname === href ? ' active' : ''}`

  // Die Login-Seite ist die einzige Seite ohne Session — dort gibt es nichts zu navigieren.
  if (pathname === '/login') return null

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">AI Enablement</span>
        </Link>

        <div className="nav-links">
          <Link href="/" className={linkClass('/')}>Leaderboard</Link>
          <Link href="/player-dashboard" className={linkClass('/player-dashboard')}>Player Dashboard</Link>
          <Link href="/play/demo" className={linkClass('/play/demo')}>Prompt-Navigator (Demo)</Link>
          {player?.is_admin && <Link href="/admin" className={linkClass('/admin')}>Admin</Link>}

          <div className="nav-user" ref={menuRef}>
            <button
              className="nav-user-btn"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {player ? (
                <>
                  <Avatar name={player.display_name} size={30} />
                  <span className="nav-user-name">{player.display_name}</span>
                </>
              ) : (
                <span className="avatar avatar-anon">👤</span>
              )}
              <span className={`nav-caret${open ? ' open' : ''}`}>▾</span>
            </button>

            {open && (
              <div className="nav-dropdown" role="menu">
                {player ? (
                  <>
                    <div className="nav-dropdown-header">
                      <Avatar name={player.display_name} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <div className="nav-dropdown-name">{player.display_name}</div>
                        <div className="nav-dropdown-email">{player.email}</div>
                      </div>
                    </div>
                    <div className="nav-dropdown-divider" />
                    <Link href="/player-dashboard" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                      <span className="nav-dropdown-icon">🎮</span> Player Dashboard
                    </Link>
                    {player.is_admin && (
                      <Link href="/admin" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                        <span className="nav-dropdown-icon">🛠️</span> Admin Dashboard
                      </Link>
                    )}
                    <div className="nav-dropdown-divider" />
                    <button className="nav-dropdown-item nav-dropdown-danger" onClick={handleLogout}>
                      <span className="nav-dropdown-icon">↩</span> Abmelden
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                    <span className="nav-dropdown-icon">🔑</span> Anmelden
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
