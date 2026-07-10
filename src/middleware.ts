import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@/lib/session'

// Erste Verteidigungslinie: authentifiziert, nicht autorisiert. Der Admin-Check
// braucht die DB und passiert deshalb in src/app/admin/layout.tsx bzw. in den
// /api/admin-Routen.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout'])

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const token = req.cookies.get(SESSION_COOKIE)?.value
  let playerId: string | null = null
  if (token) {
    try {
      playerId = await verifyToken(token)
    } catch {
      playerId = null
    }
  }

  if (PUBLIC_PATHS.has(pathname)) {
    // Wer schon eingeloggt ist, hat auf der Login-Seite nichts verloren.
    if (pathname === '/login' && playerId) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (playerId) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const login = new URL('/login', req.url)
  login.searchParams.set('next', pathname + search)
  const res = NextResponse.redirect(login)
  // Abgelaufenes Token nicht mitschleppen.
  if (token) res.cookies.delete(SESSION_COOKIE)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
