import 'server-only'
import webpush from 'web-push'
import { sql } from './db'

export type Message = { title: string; body: string; url?: string }
export type Channel = 'push' | 'email' | 'whatsapp'

const env = process.env

export function channelStatus(): Record<Channel, boolean> {
  return {
    push: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
    email: Boolean(env.RESEND_API_KEY && env.REMINDER_EMAIL_TO),
    whatsapp: Boolean(env.CALLMEBOT_PHONE && env.CALLMEBOT_APIKEY),
  }
}

async function sendPush(msg: Message) {
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:admin@example.com', env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)
  const subs = await sql<{ id: number; endpoint: string; p256dh: string; auth: string }[]>`select * from push_subscriptions`
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(msg),
        )
      } catch (e) {
        // 404/410: inscrição expirada (ex.: app desinstalado)
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sql`delete from push_subscriptions where id = ${s.id}`
        else throw e
      }
    }),
  )
}

async function sendEmail(msg: Message) {
  const link = msg.url ? `<p><a href="${env.APP_URL}${msg.url}">Abrir no app</a></p>` : ''
  const html = `<h2 style="font-family:sans-serif">${esc(msg.title)}</h2>
    <pre style="font-family:sans-serif;white-space:pre-wrap;font-size:15px">${esc(msg.body)}</pre>${link}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.REMINDER_EMAIL_FROM ?? 'Funil <onboarding@resend.dev>',
      to: env.REMINDER_EMAIL_TO,
      subject: msg.title,
      html,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

/** WhatsApp para o próprio número via CallMeBot (gratuito, uso pessoal). */
async function sendWhatsApp(msg: Message) {
  const text = `*${msg.title}*\n${msg.body}${msg.url ? `\n${env.APP_URL}${msg.url}` : ''}`
  const url = new URL('https://api.callmebot.com/whatsapp.php')
  url.searchParams.set('phone', env.CALLMEBOT_PHONE!)
  url.searchParams.set('apikey', env.CALLMEBOT_APIKEY!)
  url.searchParams.set('text', text)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CallMeBot ${res.status}: ${await res.text()}`)
}

const senders: Record<Channel, (m: Message) => Promise<void>> = { push: sendPush, email: sendEmail, whatsapp: sendWhatsApp }

/** Envia pelos canais ligados nas configurações e configurados no ambiente. */
export async function notify(msg: Message, only?: Channel[]) {
  const [row] = await sql<{ value: string }[]>`select value from settings where key = 'channels'`
  const enabled = (only ?? (row?.value.split(',') as Channel[])).filter(Boolean)
  const ready = channelStatus()
  const results: Record<string, string> = {}
  for (const ch of enabled) {
    if (!ready[ch]) {
      results[ch] = 'não configurado'
      continue
    }
    try {
      await senders[ch](msg)
      results[ch] = 'ok'
    } catch (e) {
      results[ch] = `erro: ${(e as Error).message}`
    }
  }
  return results
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
