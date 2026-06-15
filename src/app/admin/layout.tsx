'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const links = [
    { href: '/admin', label: '📊 Übersicht' },
    { href: '/admin/players', label: '👤 Spieler' },
    { href: '/admin/scores', label: '🏆 Scores' },
    { href: '/admin/games', label: '🎮 Games' },
  ]

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Plattform-Verwaltung — PoC Dashboard</p>
      </div>

      <nav className="admin-subnav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`admin-subnav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {children}
    </>
  )
}
