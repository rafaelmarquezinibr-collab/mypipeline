import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getLead, getStages, LEAD_STATUS } from '@/lib/data'
import { addNote, updateLead } from '@/app/actions'
import { fmtDateTime } from '@/lib/dates'
import { TaskItem } from '@/components/TaskItem'
import { LeadActions, DeleteLead } from '@/components/LeadActions'
import { Loading } from '@/components/Loading'
import { SubmitButton } from '@/components/SubmitButton'

export default function LeadPage({ params }: PageProps<'/leads/[id]'>) {
  return <Suspense fallback={<Loading />}><LeadView params={params} /></Suspense>
}

async function LeadView({ params }: { params: Promise<{ id: string }> }) {
  const [data, stages] = await Promise.all([getLead(Number((await params).id)), getStages()])
  if (!data) notFound()
  const { lead, tasks, notes, deals } = data
  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">← Leads</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{lead.name}</h1>
          <p className="text-sm text-slate-500">{[lead.company, lead.email, lead.phone].filter(Boolean).join(' · ')}</p>
          {deals.map((d) => <Link key={d.id} href={`/negocios/${d.id}`} className="mt-1 block text-sm text-indigo-600 hover:underline">Negócio: {d.title} →</Link>)}
        </div>
        <LeadActions lead={lead} stages={stages} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="card">
            <h2 className="h2 px-4 pt-3">Próximas ações</h2>
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => <TaskItem key={t.id} task={t} showRef={false} />)}
              {!tasks.length && <p className="px-4 py-3 text-sm text-slate-400">Nenhuma ação.</p>}
            </div>
          </section>
          <section className="card p-4">
            <h2 className="h2 mb-3">Notas</h2>
            <form action={addNote} className="mb-4 flex gap-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <input name="body" className="input" placeholder="Registrar algo…" required />
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
            <form action={updateLead} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              {([['Nome', 'name'], ['Empresa', 'company'], ['E-mail', 'email'], ['Telefone', 'phone'], ['Origem', 'source']] as const).map(([l, n]) => (
                <div key={n}><label className="label">{l}</label><input name={n} className="input" defaultValue={lead[n] ?? ''} required={n === 'name'} /></div>
              ))}
              <div>
                <label className="label">Status</label>
                <select name="status" className="input" defaultValue={lead.status}>
                  {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="label">Notas gerais</label><textarea name="notes" rows={3} className="input" defaultValue={lead.notes ?? ''} /></div>
              <SubmitButton className="btn-ghost w-full">Salvar dados</SubmitButton>
            </form>
          </section>
          <DeleteLead id={lead.id} />
        </div>
      </div>
    </div>
  )
}
