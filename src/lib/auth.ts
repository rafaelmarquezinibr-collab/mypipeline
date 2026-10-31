import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySession } from './session'

export async function requireAuth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!(await verifySession(token))) redirect('/login')
}
