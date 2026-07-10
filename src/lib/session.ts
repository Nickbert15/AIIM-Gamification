import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'aiim_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Kein next/headers hier: dieses Modul läuft auch in der Edge-Middleware.
function secret() {
  const s = process.env.JWT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No JWT secret configured')
  return new TextEncoder().encode(s)
}

// Das Token beweist nur die Identität. Ob jemand Admin ist, wird bewusst nicht
// eingebacken, sondern bei jedem Zugriff gegen die DB geprüft — sonst wäre ein
// entzogenes Admin-Recht noch bis zu 7 Tage lang gültig.
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
