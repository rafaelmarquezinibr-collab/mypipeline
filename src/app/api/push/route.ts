import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
  await requireAuth()
  const sub = (await request.json()) as { endpoint: string; keys: { p256dh: string; auth: string } }
  await sql`insert into push_subscriptions (endpoint, p256dh, auth)
            values (${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
            on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`
  return Response.json({ ok: true })
}
