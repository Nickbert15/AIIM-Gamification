import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import NavBar from '@/components/NavBar'
import { LanguageProvider, LANG_COOKIE, type Lang } from '@/lib/i18n'

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
  const cookieLang = cookies().get(LANG_COOKIE)?.value
  const lang: Lang = cookieLang === 'en' ? 'en' : 'de'

  return (
    <html lang={lang}>
      <body className={inter.className}>
        <LanguageProvider initialLang={lang}>
          <NavBar />
          <main className="main-content">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  )
}
