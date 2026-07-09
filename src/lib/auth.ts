import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'aiim_session'
const EXPIRES_SECONDS = 60 * 60 * 24 * 7 // 7 days

function secret() {
  const s = process.env.JWT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No JWT secret configured')
  return new TextEncoder().encode(s)
}

export async function signToken(playerId: string) {
  return new SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(await secret())
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, await secret())
  return payload.sub as string
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: EXPIRES_SECONDS,
    path: '/',
  })
}

export function clearSessionCookie() {
  cookies().delete(COOKIE)
}

export function getSessionToken(): string | null {
  return cookies().get(COOKIE)?.value ?? null
}
