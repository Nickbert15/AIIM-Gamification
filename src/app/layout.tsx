import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LHG AI Enablement Platform',
  description: 'Gamified AI Learning for Lufthansa Group Finance & Controlling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <nav className="nav-bar">
          <div className="nav-inner">
            <Link href="/" className="nav-logo">
              <span className="logo-icon">✈</span>
              <span className="logo-text">AI Enablement</span>
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">Leaderboard</Link>
              <Link href="/admin" className="nav-link nav-link-admin">Admin</Link>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
