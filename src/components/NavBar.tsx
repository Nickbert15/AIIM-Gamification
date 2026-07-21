'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Gamepad2, Wrench, LogOut, KeyRound, User, Globe } from 'lucide-react'
import Avatar from './Avatar'
import { useI18n, LANGS, type Lang } from '@/lib/i18n'

type Player = { display_name: string; email: string; role: string; is_admin: boolean }

export default function NavBar() {
  const { t, lang, setLang } = useI18n()
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
          <span className="logo-icon">
            <Image src="/lufthansa-crane-white.svg" alt="" width={22} height={22} priority />
          </span>
          <span className="logo-text">AI Enablement</span>
        </Link>

        <div className="nav-links">
          <Link href="/" className={linkClass('/')}>{t('nav.leaderboard')}</Link>
          <Link href="/player-dashboard" className={linkClass('/player-dashboard')}>{t('nav.playerDashboard')}</Link>
          {player?.is_admin && <Link href="/admin" className={linkClass('/admin')}>{t('nav.admin')}</Link>}

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
                <span className="avatar avatar-anon"><User size={16} strokeWidth={2.25} /></span>
              )}
              <span className={`nav-caret${open ? ' open' : ''}`}><ChevronDown size={14} strokeWidth={2.25} /></span>
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
                      <span className="nav-dropdown-icon"><Gamepad2 size={16} strokeWidth={2} /></span> {t('nav.playerDashboard')}
                    </Link>
                    {player.is_admin && (
                      <Link href="/admin" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                        <span className="nav-dropdown-icon"><Wrench size={16} strokeWidth={2} /></span> {t('nav.adminDashboard')}
                      </Link>
                    )}
                    <div className="nav-dropdown-divider" />
                    <LanguageSwitcher lang={lang} setLang={setLang} label={t('nav.language')} />
                    <div className="nav-dropdown-divider" />
                    <button className="nav-dropdown-item nav-dropdown-danger" onClick={handleLogout}>
                      <span className="nav-dropdown-icon"><LogOut size={16} strokeWidth={2} /></span> {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <LanguageSwitcher lang={lang} setLang={setLang} label={t('nav.language')} />
                    <div className="nav-dropdown-divider" />
                    <Link href="/login" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                      <span className="nav-dropdown-icon"><KeyRound size={16} strokeWidth={2} /></span> {t('nav.login')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function LanguageSwitcher({
  lang,
  setLang,
  label,
}: {
  lang: Lang
  setLang: (lang: Lang) => void
  label: string
}) {
  return (
    <div className="nav-lang">
      <span className="nav-lang-label">
        <span className="nav-dropdown-icon"><Globe size={16} strokeWidth={2} /></span>
        {label}
      </span>
      <div className="nav-lang-options" role="group" aria-label={label}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`nav-lang-btn${lang === l.code ? ' active' : ''}`}
            aria-pressed={lang === l.code}
            title={l.label}
            onClick={() => setLang(l.code)}
          >
            {l.short}
          </button>
        ))}
      </div>
    </div>
  )
}
