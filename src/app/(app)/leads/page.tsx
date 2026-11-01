import Link from 'next/link'
import { Suspense } from 'react'
import { getLeads, LEAD_STATUS, type Lead } from '@/lib/data'
import { fmtDateTime } from '@/lib/dates'
import { Loading } from '@/components/Loading'
import { NewLeadButton } from '@/components/LeadsToolbar'

export default function LeadsPage({ searchParams }: PageProps<'/leads'>) {
  return <Suspense fallback={<Loading />}><Leads searchParams={searchParams} /></Suspense>
}

const SORTS: Record<string, string> = { proxima: 'Próxima ação', nome: 'Nome (A-Z)', recente: 'Mais recente', antigo: 'Mais antigo' }

const statusColor: Record<string, string> = {
  novo: 'bg-sky-100 text-sky-800', tentativa: 'bg-indigo-100 text-indigo-800', contato: 'bg-violet-100 text-violet-800',
  agendado: 'bg-amber-100 text-amber-800', realizado: 'bg-emerald-100 text-emerald-800',
  descartado: 'bg-slate-100 text-slate-500', convertido: 'bg-slate-800 text-white',
}

async function Leads({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const filter = typeof sp.status === 'string' ? sp.status : 'ativos'
  const q = typeof sp.q === 'string' ? sp.q.toLowerCase() : ''
  const sort = typeof sp.ordem === 'string' && sp.ordem in SORTS ? sp.ordem : 'proxima'
  const all = await getLeads()
  const leads = all
    .filter((l) => filter === 'todos' ? true : filter === 'ativos' ? !['descartado', 'convertido'].includes(l.status) : l.status === filter)
    .filter((l) => !q || [l.name, l.company, l.email].some((v) => v?.toLowerCase().includes(q)))
  // 'proxima' mantém a ordem do banco: sem próxima ação primeiro, depois a mais urgente.
  if (sort === 'nome') leads.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  // Leads importados chegam com a mesma data de criação; o ID do HubSpot é sequencial e desempata.
  const age = (a: Lead, b: Lead) => +new Date(a.created_at) - +new Date(b.created_at)
    || Number(a.hubspot_id ?? 0) - Number(b.hubspot_id ?? 0) || a.id - b.id
  if (sort === 'recente') leads.sort((a, b) => age(b, a))
  if (sort === 'antigo') leads.sort(age)
  const href = (p: { status?: string; ordem?: string }) => {
    const u = new URLSearchParams({ status: p.status ?? filter })
    const o = p.ordem ?? sort
    if (o !== 'proxima') u.set('ordem', o)
    if (q) u.set('q', q)
    return `/leads?${u}`
  }
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
          <Link key={k} href={href({ status: k })}
            className={`chip px-3 py-1 ${filter === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {v}{counts[k] ? ` (${counts[k]})` : ''}
          </Link>
        ))}
        <form className="ml-auto"><input type="hidden" name="status" value={filter} />
          {sort !== 'proxima' && <input type="hidden" name="ordem" value={sort} />}
          <input name="q" defaultValue={q} placeholder="Buscar…" className="input w-48" /></form>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Ordenar por:</span>
        {Object.entries(SORTS).map(([k, v]) => (
          <Link key={k} href={href({ ordem: k })}
            className={`chip px-3 py-1 ${sort === k ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{v}</Link>
        ))}
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
