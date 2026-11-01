'use client'

import { useState } from 'react'
import { sendDigestNow, testNotify } from '@/app/notify-actions'

type Ch = 'push' | 'email' | 'telegram' | 'whatsapp'
const names: Record<Ch, string> = { push: 'Notificação no celular', email: 'E-mail', telegram: 'Telegram', whatsapp: 'WhatsApp (CallMeBot)' }

function b64ToUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function NotifyPanel({ status, vapidKey }: { status: Record<Ch, boolean>; vapidKey: string | null }) {
  const [msg, setMsg] = useState<string | null>(null)

  async function enablePush() {
    try {
      if (!vapidKey) throw new Error('Configure as chaves VAPID no servidor')
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('No iPhone, primeiro adicione o app à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra por lá')
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Permissão de notificação negada')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapidKey) }))
      const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      if (!res.ok) throw new Error('Falha ao salvar inscrição')
      setMsg('Notificações ativadas neste aparelho.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  async function test(ch: Ch) {
    setMsg('Enviando…')
    const r = await testNotify(ch)
    setMsg(`${names[ch]}: ${r[ch]}`)
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {(Object.keys(names) as Ch[]).map((ch) => (
          <li key={ch} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{status[ch] ? '🟢' : '⚪️'} {names[ch]} {!status[ch] && <span className="text-xs text-slate-400">(falta configurar no servidor)</span>}</span>
            <span className="flex gap-1">
              {ch === 'push' && <button type="button" className="btn-ghost btn-sm" onClick={enablePush} disabled={!status.push}>Ativar neste aparelho</button>}
              <button type="button" className="btn-ghost btn-sm" onClick={() => test(ch)} disabled={!status[ch]}>Testar</button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-ghost btn-sm" onClick={async () => { setMsg('Enviando…'); setMsg(JSON.stringify(await sendDigestNow())) }}>
        Enviar resumo do dia agora
      </button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  )
}
