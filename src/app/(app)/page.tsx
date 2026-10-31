import Link from 'next/link'
import { Suspense } from 'react'
import { getStages, getToday, type Task } from '@/lib/data'
import { daysSince, startOfTodayBR } from '@/lib/dates'
import { TaskItem } from '@/components/TaskItem'
import { Loading } from '@/components/Loading'
import { QuickAdd } from '@/components/QuickAdd'

export default function TodayPage() {
  return <Suspense fallback={<Loading />}><Today /></Suspense>
}

async function Today() {
  const [{ tasks, dealsWithoutNext, staleDeals, leadsWithoutNext }, stages] = await Promise.all([getToday(), getStages()])
  const now = new Date()
  const endToday = new Date(startOfTodayBR().getTime() + 86_400_000)
  const overdue = tasks.filter((t) => new Date(t.due_at) < now)
  const today = tasks.filter((t) => new Date(t.due_at) >= now && new Date(t.due_at) < endToday)
  const week = tasks.filter((t) => new Date(t.due_at) >= endToday)
  const alerts = dealsWithoutNext.length + leadsWithoutNext.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h1">Hoje</h1>
          <p className="text-sm text-slate-500">
            {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
          </p>
        </div>
        <QuickAdd stages={stages} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Atrasadas" value={overdue.length} tone={overdue.length ? 'red' : 'slate'} />
        <Stat label="Para hoje" value={today.length} tone="indigo" />
        <Stat label="Sem próxima ação" value={alerts} tone={alerts ? 'amber' : 'slate'} />
        <Stat label="Parados na etapa" value={staleDeals.length} tone={staleDeals.length ? 'amber' : 'slate'} />
      </div>

      {alerts > 0 && (
        <section className="card border-amber-200 bg-amber-50/60">
          <h2 className="h2 px-4 pt-3 text-amber-800">⚠️ Sem próxima ação</h2>
          <p className="px-4 text-xs text-amber-700">Cada item aqui é algo que pode ser esquecido. Abra e defina o próximo passo.</p>
          <ul className="divide-y divide-amber-100">
            {dealsWithoutNext.map((d) => (
              <li key={`d${d.id}`}><Link href={`/negocios/${d.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-amber-50">
                <span className="font-medium">{d.title}</span><span className="text-xs text-slate-500">{d.stage_name}</span></Link></li>
            ))}
            {leadsWithoutNext.map((l) => (
              <li key={`l${l.id}`}><Link href={`/leads/${l.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-amber-50">
                <span className="font-medium">{l.name}{l.company && l.company !== l.name && ` · ${l.company}`}</span><span className="text-xs text-slate-500">Lead</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <TaskSection title="🔴 Atrasadas" tasks={overdue} empty={null} />
      <TaskSection title="Hoje" tasks={today} empty="Nada marcado para o resto do dia." />
      <TaskSection title="Próximos 7 dias" tasks={week} empty="Nada nos próximos dias." />

      {staleDeals.length > 0 && (
        <section className="card">
          <h2 className="h2 px-4 pt-3">🐢 Parados há mais tempo que o limite da etapa</h2>
          <ul className="divide-y divide-slate-100">
            {staleDeals.map((d) => (
              <li key={d.id}><Link href={`/negocios/${d.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
                <span className="font-medium">{d.title}</span>
                <span className="text-xs text-slate-500">{d.stage_name} · {daysSince(d.stage_entered_at)} dias (limite {d.stage_max_days})</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TaskSection({ title, tasks, empty }: { title: string; tasks: Task[]; empty: string | null }) {
  if (!tasks.length && empty === null) return null
  return (
    <section className="card">
      <h2 className="h2 px-4 pt-3">{title} <span className="text-slate-400">({tasks.length})</span></h2>
      {tasks.length ? (
        <div className="divide-y divide-slate-100">{tasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
      ) : <p className="px-4 py-3 text-sm text-slate-400">{empty}</p>}
    </section>
  )
}

const tones = {
  red: 'text-red-600', indigo: 'text-indigo-600', amber: 'text-amber-600', slate: 'text-slate-400',
}
function Stat({ label, value, tone }: { label: string; value: number; tone: keyof typeof tones }) {
  return (
    <div className="card p-4">
      <div className={`text-3xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
