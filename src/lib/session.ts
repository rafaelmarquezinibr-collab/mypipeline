// Sessão assinada em cookie. Sem 'server-only' porque o proxy também usa.
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'funil_session'
const key = () => {
  const secret = process.env.SESSION_SECRET?.trim()
  if (!secret) throw new Error('SESSION_SECRET não está configurada no servidor')
  return new TextEncoder().encode(secret)
}

export async function signSession() {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key())
}

export async function verifySession(token: string | undefined) {
  if (!token) return false
  try {
    await jwtVerify(token, key())
    return true
  } catch {
    return false
  }
}
