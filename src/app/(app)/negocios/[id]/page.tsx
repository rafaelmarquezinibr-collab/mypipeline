import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDeal, getStages } from '@/lib/data'
import { addNote, updateDeal } from '@/app/actions'
import { daysSince, fmtDate, fmtDateTime, fmtMoney } from '@/lib/dates'
import { TaskItem } from '@/components/TaskItem'
import { DealActions, DeleteDeal } from '@/components/DealActions'
import { Loading } from '@/components/Loading'
import { SubmitButton } from '@/components/SubmitButton'

export default function DealPage({ params }: PageProps<'/negocios/[id]'>) {
  return <Suspense fallback={<Loading />}><DealView params={params} /></Suspense>
}

async function DealView({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const [data, stages] = await Promise.all([getDeal(id), getStages()])
  if (!data) notFound()
  const { deal, tasks, notes, history } = data
  const statusChip = {
    aberto: <span className="chip text-white" style={{ background: deal.stage_color }}>{deal.stage_name}</span>,
    ganho: <span className="chip bg-emerald-100 text-emerald-800">Ganho</span>,
    perdido: <span className="chip bg-red-100 text-red-700">Perdido{deal.lost_reason && ` · ${deal.lost_reason}`}</span>,
  }[deal.status]
  const stageIdx = stages.findIndex((s) => s.id === deal.stage_id)

  return (
    <div className="space-y-5">
      <Link href="/pipeline" className="text-sm text-slate-500 hover:text-slate-700">← Pipeline</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="h1">{deal.title}</h1>{statusChip}</div>
          <p className="mt-1 text-sm text-slate-500">
            {[...new Set([deal.company, deal.contact_name].filter((v) => v && v !== deal.title))].join(' · ')}
            {deal.status === 'aberto' && ` · ${daysSince(deal.stage_entered_at)} dias nesta etapa`}
          </p>
          <p className="mt-1 text-2xl font-semibold">{fmtMoney(deal.value)}</p>
        </div>
        <DealActions deal={deal} stages={stages} />
      </div>

      {/* Barra de progresso das etapas */}
      <div className="flex gap-1">
        {stages.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div className="h-1.5 rounded-full" style={{ background: i <= stageIdx ? s.color : '#e2e8f0' }} />
            <div className={`mt-1 hidden truncate text-[11px] sm:block ${i === stageIdx ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>{s.name}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="card">
            <h2 className="h2 px-4 pt-3">Próximas ações</h2>
            {deal.status === 'aberto' && !deal.next_task_id && (
              <p className="mx-4 mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ Este negócio está sem próxima ação. Use “+ Próxima ação”.</p>
            )}
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => <TaskItem key={t.id} task={t} showRef={false} />)}
              {!tasks.length && <p className="px-4 py-3 text-sm text-slate-400">Nenhuma ação.</p>}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="h2 mb-3">Notas</h2>
            <form action={addNote} className="mb-4 flex gap-2">
              <input type="hidden" name="deal_id" value={deal.id} />
              <input name="body" className="input" placeholder="Registrar algo da conversa…" required />
              <SubmitButton>Salvar</SubmitButton>
            </form>
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="whitespace-pre-wrap text-sm">{n.body}</div>
                  <div className="text-xs text-slate-400">{fmtDateTime(n.created_at)}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-4">
            <h2 className="h2 mb-3">Dados</h2>
            <form action={updateDeal} className="space-y-3">
              <input type="hidden" name="id" value={deal.id} />
              <In label="Nome" name="title" value={deal.title} required />
              <In label="Empresa" name="company" value={deal.company} />
              <In label="Contato" name="contact_name" value={deal.contact_name} />
              <In label="E-mail" name="email" value={deal.email} type="email" />
              <In label="Telefone" name="phone" value={deal.phone} />
              <In label="Valor (R$)" name="value" value={String(deal.value)} />
              <In label="Previsão de fechamento" name="expected_close" type="date"
                value={deal.expected_close ? new Date(deal.expected_close).toISOString().slice(0, 10) : ''} />
              <div><label className="label">Notas gerais</label><textarea name="notes" rows={3} className="input" defaultValue={deal.notes ?? ''} /></div>
              <SubmitButton className="btn-ghost w-full">Salvar dados</SubmitButton>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="h2 mb-3">Histórico</h2>
            <ul className="space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{h.from_name ? `${h.from_name} → ${h.to_name}` : `Criado em ${h.to_name}`}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(h.changed_at)}</span>
                </li>
              ))}
              {deal.closed_at && <li className="flex justify-between"><span>Fechado ({deal.status})</span><span className="text-xs text-slate-400">{fmtDate(deal.closed_at)}</span></li>}
            </ul>
            {deal.lead_id && <Link href={`/leads/${deal.lead_id}`} className="mt-3 block text-xs text-indigo-600 hover:underline">Ver lead de origem</Link>}
          </section>
          <DeleteDeal id={deal.id} />
        </div>
      </div>
    </div>
  )
}

function In({ label, value, ...props }: { label: string; value: string | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'>) {
  return <div><label className="label">{label}</label><input className="input" defaultValue={value ?? ''} {...props} /></div>
}
