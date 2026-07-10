import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

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
        <NavBar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
