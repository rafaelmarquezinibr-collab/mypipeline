'use server'

import { requireAuth } from '@/lib/auth'
import { notify, type Channel } from '@/lib/notify'
import { buildDigest } from '@/lib/reminders'

export async function testNotify(channel: Channel) {
  await requireAuth()
  return notify({ title: '✅ Teste do Funil', body: 'Se você está lendo isso, este canal de lembretes funciona.', url: '/' }, [channel])
}

export async function sendDigestNow() {
  await requireAuth()
  return notify(await buildDigest())
}
