import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@/lib/session'

// First line of defense: authenticates, doesn't authorize. The admin check needs
// the DB and therefore happens in src/app/admin/layout.tsx and in the /api/admin
// routes.
// /play/demo is intentionally public: it's a pure client-side preview with
// hardcoded sample data (src/content/promptNavigatorDemo.ts), no network/DB access.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout', '/play/demo'])

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
    // Anyone already logged in has no business being on the login page.
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
  // Don't carry over an expired token.
  if (token) res.cookies.delete(SESSION_COOKIE)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
