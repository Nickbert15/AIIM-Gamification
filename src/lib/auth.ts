import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from '@/lib/session'

export { signToken, verifyToken, SESSION_COOKIE }

export type SessionPlayer = {
  id: string
  email: string
  display_name: string
  role: string
  is_admin: boolean
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE)
}

export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null
}

/** The logged-in player's ID, or null if the token is missing/invalid. */
export async function getSessionPlayerId(): Promise<string | null> {
  const token = getSessionToken()
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

/** The logged-in player, freshly read from the DB — including the current is_admin. */
export async function getSessionPlayer(): Promise<SessionPlayer | null> {
  const playerId = await getSessionPlayerId()
  if (!playerId) return null

  const { data } = await supabaseAdmin
    .from('players')
    .select('id, email, display_name, role, is_admin')
    .eq('id', playerId)
    .maybeSingle()

  return data ?? null
}

/** The logged-in player, but only if they're an admin. Otherwise null. */
export async function getSessionAdmin(): Promise<SessionPlayer | null> {
  const player = await getSessionPlayer()
  return player?.is_admin ? player : null
}
