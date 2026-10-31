import Link from 'next/link'
import { Suspense } from 'react'
import { getLeads, LEAD_STATUS } from '@/lib/data'
import { fmtDateTime } from '@/lib/dates'
import { Loading } from '@/components/Loading'
import { NewLeadButton } from '@/components/LeadsToolbar'

export default function LeadsPage({ searchParams }: PageProps<'/leads'>) {
  return <Suspense fallback={<Loading />}><Leads searchParams={searchParams} /></Suspense>
}

const statusColor: Record<string, string> = {
  novo: 'bg-sky-100 text-sky-800', tentativa: 'bg-indigo-100 text-indigo-800', contato: 'bg-violet-100 text-violet-800',
  agendado: 'bg-amber-100 text-amber-800', realizado: 'bg-emerald-100 text-emerald-800',
  descartado: 'bg-slate-100 text-slate-500', convertido: 'bg-slate-800 text-white',
}

async function Leads({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const filter = typeof sp.status === 'string' ? sp.status : 'ativos'
  const q = typeof sp.q === 'string' ? sp.q.toLowerCase() : ''
  const all = await getLeads()
  const leads = all
    .filter((l) => filter === 'todos' ? true : filter === 'ativos' ? !['descartado', 'convertido'].includes(l.status) : l.status === filter)
    .filter((l) => !q || [l.name, l.company, l.email].some((v) => v?.toLowerCase().includes(q)))
  const counts = all.reduce<Record<string, number>>((a, l) => ({ ...a, [l.status]: (a[l.status] ?? 0) + 1 }), {})
  const now = new Date()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Leads</h1>
        <NewLeadButton />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[['ativos', 'Ativos'], ...Object.entries(LEAD_STATUS), ['todos', 'Todos']].map(([k, v]) => (
          <Link key={k} href={`/leads?status=${k}`}
            className={`chip px-3 py-1 ${filter === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {v}{counts[k] ? ` (${counts[k]})` : ''}
          </Link>
        ))}
        <form className="ml-auto"><input type="hidden" name="status" value={filter} />
          <input name="q" defaultValue={q} placeholder="Buscar…" className="input w-48" /></form>
      </div>
      <div className="card divide-y divide-slate-100">
        {leads.map((l) => (
          <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{l.name}{l.company && l.company !== l.name && <span className="text-slate-500"> · {l.company}</span>}</div>
              <div className={`text-xs ${!l.next_task_at && !['descartado', 'convertido'].includes(l.status) ? 'text-amber-700' : l.next_task_at && new Date(l.next_task_at) < now ? 'text-red-600' : 'text-slate-500'}`}>
                {l.next_task_at ? `→ ${l.next_task_title} · ${fmtDateTime(l.next_task_at)}` : ['descartado', 'convertido'].includes(l.status) ? (l.source ?? '') : '⚠️ Sem próxima ação'}
              </div>
            </div>
            <span className={`chip shrink-0 ${statusColor[l.status]}`}>{LEAD_STATUS[l.status]}</span>
          </Link>
        ))}
        {!leads.length && <p className="px-4 py-3 text-sm text-slate-400">Nenhum lead aqui.</p>}
      </div>
    </div>
  )
}
