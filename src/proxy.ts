import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!ok) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = {
  // Rotas públicas: login, cron (usa CRON_SECRET), feed de agenda (usa token), PWA
  matcher: ['/((?!login|api/cron|api/calendario|_next|sw.js|manifest.webmanifest|icon|favicon.ico).*)'],
}
