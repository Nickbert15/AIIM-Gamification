'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Übersicht' },
  { href: '/admin/players', label: 'Spieler' },
  { href: '/admin/scores', label: 'Scores' },
  { href: '/admin/games', label: 'Games' },
  { href: '/admin/feedback', label: 'Feedback' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="admin-subnav">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`admin-subnav-link ${pathname === link.href ? 'active' : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
