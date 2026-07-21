'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

const LINKS = [
  { href: '/admin', labelKey: 'admin.nav.overview' },
  { href: '/admin/players', labelKey: 'admin.nav.players' },
  { href: '/admin/scores', labelKey: 'admin.nav.scores' },
  { href: '/admin/games', labelKey: 'admin.nav.games' },
  { href: '/admin/feedback', labelKey: 'admin.nav.feedback' },
]

export default function AdminNav() {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <nav className="admin-subnav">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`admin-subnav-link ${pathname === link.href ? 'active' : ''}`}
        >
          {t(link.labelKey)}
        </Link>
      ))}
    </nav>
  )
}
