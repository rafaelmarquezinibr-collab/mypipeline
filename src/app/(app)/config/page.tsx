import Link from 'next/link'
import { Suspense } from 'react'
import { getSettings, getStages } from '@/lib/data'
import { addStage, deleteStage, logout, moveStage, saveSettings, updateStage } from '@/app/actions'
import { channelStatus } from '@/lib/notify'
import { Loading } from '@/components/Loading'
import { NotifyPanel } from '@/components/NotifyPanel'
import { SubmitButton } from '@/components/SubmitButton'

export default function ConfigPage() {
  return <Suspense fallback={<Loading />}><Config /></Suspense>
}

async function Config() {
  const [stages, settings] = await Promise.all([getStages(), getSettings()])
  const channels = settings.channels?.split(',') ?? []
  const calUrl = process.env.CALENDAR_TOKEN ? `${process.env.APP_URL}/api/calendario?token=${process.env.CALENDAR_TOKEN}` : null

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="h1">Ajustes</h1>

      <section className="card p-4">
        <h2 className="h2 mb-1">Etapas do pipeline</h2>
        <p className="mb-3 text-xs text-slate-500">“Limite” é quantos dias um negócio pode ficar na etapa antes de aparecer como parado 🐢.</p>
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2">
              <form action={updateStage} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input type="color" name="color" defaultValue={s.color} className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-200" />
                <input name="name" defaultValue={s.name} className="input" required />
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                  Limite <input name="max_days" type="number" min={1} defaultValue={s.max_days} className="input w-16" /> dias
                </label>
                <SubmitButton className="btn-ghost btn-sm">Salvar</SubmitButton>
              </form>
              <div className="flex gap-1">
                {(['up', 'down'] as const).map((dir) => (
                  <form key={dir} action={moveStage}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value={dir} />
                    <button className="btn-ghost btn-sm" disabled={dir === 'up' ? i === 0 : i === stages.length - 1}>{dir === 'up' ? '↑' : '↓'}</button>
                  </form>
                ))}
                <form action={deleteStage}><input type="hidden" name="id" value={s.id} /><button className="btn-ghost btn-sm text-red-600" title="Excluir (só se estiver vazia)">✕</button></form>
              </div>
            </div>
          ))}
        </div>
        <form action={addStage} className="mt-3 flex gap-2">
          <input name="name" className="input" placeholder="Nova etapa" required />
          <SubmitButton className="btn-ghost">Adicionar</SubmitButton>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="h2 mb-3">Lembretes</h2>
        <form action={saveSettings} className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            {[['push', 'Celular'], ['email', 'E-mail'], ['whatsapp', 'WhatsApp']].map(([k, v]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={`ch_${k}`} defaultChecked={channels.includes(k)} /> {v}</label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Avisar quantos minutos antes</label><input name="remind_minutes_before" type="number" min={0} className="input" defaultValue={settings.remind_minutes_before} /></div>
            <div><label className="label">Hora do resumo diário</label><input name="daily_digest_hour" type="number" min={0} max={23} className="input" defaultValue={settings.daily_digest_hour} /></div>
          </div>
          <p className="text-xs text-slate-500">Ações atrasadas são cobradas de novo a cada 3 horas, das 8h às 20h, até você concluir ou adiar.</p>
          <SubmitButton className="btn-ghost">Salvar lembretes</SubmitButton>
        </form>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <NotifyPanel status={channelStatus()} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="h2 mb-2">Agenda do Outlook</h2>
        {calUrl ? (
          <>
            <p className="mb-2 text-sm text-slate-600">No Outlook: Calendário → Adicionar calendário → <b>Assinar da Web</b> → cole o link abaixo. Suas próximas ações aparecem na agenda.</p>
            <input readOnly value={calUrl} className="input font-mono text-xs" />
          </>
        ) : <p className="text-sm text-slate-500">Defina CALENDAR_TOKEN no servidor para gerar o link da agenda.</p>}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <Link href="/importar" className="btn-ghost">Importar do HubSpot</Link>
        <form action={logout}><button className="btn-ghost">Sair</button></form>
      </section>
    </div>
  )
}
