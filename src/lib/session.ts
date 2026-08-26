import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'aiim_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// No next/headers here: this module also runs in Edge Middleware.
function secret() {
  const s = process.env.JWT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No JWT secret configured')
  return new TextEncoder().encode(s)
}

// The token only proves identity. Whether someone is an admin is deliberately
// not baked in, but checked against the DB on every access — otherwise a
// revoked admin right would still be valid for up to 7 days.
export async function signToken(playerId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(playerId)
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret())
  if (!payload.sub) throw new Error('No subject in token')
  return payload.sub
}
