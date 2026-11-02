import 'server-only'
import webpush from 'web-push'
import { sql } from './db'
import { appUrl } from '@/lib/app-url'

export type Message = { title: string; body: string; url?: string }
export type Channel = 'push' | 'email' | 'telegram' | 'whatsapp'

const env = process.env

export function channelStatus(): Record<Channel, boolean> {
  return {
    push: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
    email: Boolean(env.RESEND_API_KEY && env.REMINDER_EMAIL_TO),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN),
    whatsapp: Boolean(env.CALLMEBOT_PHONE && env.CALLMEBOT_APIKEY),
  }
}

/**
 * Chave VAPID como o web-push exige (base64 URL-safe, sem "=").
 * Tolera o que costuma vir junto ao colar no painel da Vercel: espaços, aspas, "NOME=" na frente.
 */
export function vapidKey(v: string | undefined) {
  return (v ?? '').trim().replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '').trim()
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sendPush(msg: Message) {
  webpush.setVapidDetails(
    (env.VAPID_SUBJECT ?? '').trim() || 'mailto:admin@example.com',
    vapidKey(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidKey(env.VAPID_PRIVATE_KEY),
  )
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
  const link = msg.url ? `<p><a href="${appUrl()}${msg.url}">Abrir no app</a></p>` : ''
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

/**
 * Telegram por um bot próprio (gratuito). Só o token é obrigatório: se TELEGRAM_CHAT_ID
 * não estiver definido, usa a conversa de quem mandou /start para o bot e guarda o id.
 */
async function telegramChatId() {
  if (env.TELEGRAM_CHAT_ID) return env.TELEGRAM_CHAT_ID
  const [saved] = await sql<{ value: string }[]>`select value from settings where key = 'telegram_chat_id'`
  if (saved) return saved.value
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`)
  const data = (await res.json()) as { ok: boolean; description?: string; result?: { message?: { chat: { id: number; type: string } } }[] }
  if (!data.ok) throw new Error(`Telegram: ${data.description ?? res.status}`)
  const chat = data.result?.map((u) => u.message?.chat).filter((c) => c?.type === 'private').pop()
  if (!chat) throw new Error('abra o seu bot no Telegram e mande /start, depois teste de novo')
  await sql`insert into settings (key, value) values ('telegram_chat_id', ${String(chat.id)})
            on conflict (key) do update set value = excluded.value`
  return String(chat.id)
}

async function sendTelegram(msg: Message) {
  const link = msg.url ? `\n<a href="${appUrl()}${msg.url}">Abrir no app</a>` : ''
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: await telegramChatId(),
      text: `<b>${esc(msg.title)}</b>\n${esc(msg.body)}${link}`,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`)
}

/** WhatsApp para o próprio número via CallMeBot (gratuito, uso pessoal). */
async function sendWhatsApp(msg: Message) {
  const text = `*${msg.title}*\n${msg.body}${msg.url ? `\n${appUrl()}${msg.url}` : ''}`
  const url = new URL('https://api.callmebot.com/whatsapp.php')
  url.searchParams.set('phone', env.CALLMEBOT_PHONE!)
  url.searchParams.set('apikey', env.CALLMEBOT_APIKEY!)
  url.searchParams.set('text', text)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CallMeBot ${res.status}: ${await res.text()}`)
}

const senders: Record<Channel, (m: Message) => Promise<void>> = { push: sendPush, email: sendEmail, telegram: sendTelegram, whatsapp: sendWhatsApp }

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
