import Link from 'next/link'
import { Suspense } from 'react'
import { getDashboard, LEAD_STATUS } from '@/lib/data'
import { fmtMoney } from '@/lib/dates'
import { Loading } from '@/components/Loading'

export default function DashboardPage() {
  return <Suspense fallback={<Loading />}><Dashboard /></Suspense>
}

async function Dashboard() {
  const { byStage, reached, avgDays, results, monthly, leadStats } = await getDashboard()
  const open = byStage.reduce((a, s) => ({ count: a.count + s.count, total: a.total + s.total }), { count: 0, total: 0 })
  const won = results.find((r) => r.status === 'ganho') ?? { count: 0, total: 0 }
  const lost = results.find((r) => r.status === 'perdido') ?? { count: 0, total: 0 }
  const winRate = won.count + lost.count ? Math.round((won.count / (won.count + lost.count)) * 100) : null
  const maxTotal = Math.max(...byStage.map((s) => s.total), 1)
  const maxReached = Math.max(...reached.map((r) => r.reached), 1)
  const maxMonth = Math.max(...monthly.map((m) => m.won), 1)
  const leadsActive = leadStats.filter((l) => !['descartado', 'convertido'].includes(l.status)).reduce((a, l) => a + l.count, 0)
  const leadsConverted = leadStats.find((l) => l.status === 'convertido')?.count ?? 0

  return (
    <div className="space-y-5">
      <h1 className="h1">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Pipeline aberto" value={fmtMoney(open.total)} sub={`${open.count} negócios`} />
        <Tile label="Ganho (90 dias)" value={fmtMoney(won.total)} sub={`${won.count} negócios`} />
        <Tile label="Taxa de ganho (90 dias)" value={winRate === null ? '—' : `${winRate}%`} sub={`${won.count} ganhos · ${lost.count} perdidos`} />
        <Tile label="Leads ativos" value={String(leadsActive)} sub={`${leadsConverted} convertidos em negócio`} />
      </div>

      <section className="card p-4">
        <h2 className="h2 mb-4">Valor e quantidade por etapa</h2>
        <div className="space-y-3">
          {byStage.map((s) => (
            <Link key={s.id} href="/pipeline" className="group grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_9rem]"
              title={`${s.name}: ${s.count} negócios, ${fmtMoney(s.total)}`}>
              <span className="flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />{s.name}
              </span>
              <div className="h-5 rounded-r bg-slate-100">
                <div className="h-5 rounded-r bg-indigo-500 transition group-hover:bg-indigo-600" style={{ width: `${(s.total / maxTotal) * 100}%`, minWidth: s.total ? 4 : 0 }} />
              </div>
              <span className="text-right tabular-nums">
                <span className="font-medium">{fmtMoney(s.total)}</span>
                <span className="text-slate-500"> · {s.count}</span>
                {s.stale > 0 && <span className="ml-1 text-xs text-amber-700" title="Parados acima do limite">🐢{s.stale}</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="h2 mb-1">Funil: negócios que chegaram a cada etapa</h2>
          <p className="mb-4 text-xs text-slate-500">A porcentagem é a conversão a partir da etapa anterior.</p>
          <div className="space-y-2">
            {reached.map((r, i) => {
              const stage = byStage.find((s) => s.id === r.id)!
              const prev = reached[i - 1]?.reached
              const conv = i > 0 && prev ? Math.round((r.reached / prev) * 100) : null
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm" title={`${stage.name}: ${r.reached} negócios`}>
                  <span className="w-36 truncate">{stage.name}</span>
                  <div className="flex flex-1 justify-center">
                    <div className="h-6 rounded bg-indigo-500/85" style={{ width: `${(r.reached / maxReached) * 100}%`, minWidth: r.reached ? 6 : 0 }} />
                  </div>
                  <span className="w-20 text-right tabular-nums"><b>{r.reached}</b>{conv !== null && <span className="text-xs text-slate-500"> · {conv}%</span>}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="h2 mb-1">Tempo médio em cada etapa</h2>
          <p className="mb-4 text-xs text-slate-500">Em dias. A marca cinza é o limite definido em Ajustes.</p>
          <div className="space-y-2">
            {avgDays.map((a) => {
              const stage = byStage.find((s) => s.id === a.id)!
              const scale = Math.max(...avgDays.map((x) => x.avg_days ?? 0), ...byStage.map((s) => s.max_days), 1)
              const over = a.avg_days !== null && a.avg_days > stage.max_days
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm" title={`${stage.name}: média ${a.avg_days ?? '—'} dias, limite ${stage.max_days}`}>
                  <span className="w-36 truncate">{stage.name}</span>
                  <div className="relative h-4 flex-1 rounded-r bg-slate-100">
                    <div className={`h-4 rounded-r ${over ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${((a.avg_days ?? 0) / scale) * 100}%` }} />
                    <div className="absolute inset-y-[-3px] w-0.5 bg-slate-400" style={{ left: `${(stage.max_days / scale) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right tabular-nums">{a.avg_days ?? '—'}{over && ' ⚠️'}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="h2 mb-4">Valor ganho por mês</h2>
          <div className="flex h-40 items-end gap-3">
            {monthly.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.month}: ${fmtMoney(m.won)} ganho, ${m.lost} perdidos`}>
                <span className="text-[11px] tabular-nums text-slate-600">{m.won ? fmtMoney(m.won) : ''}</span>
                <div className="w-full max-w-10 rounded-t bg-emerald-500" style={{ height: `${(m.won / maxMonth) * 100}%`, minHeight: m.won ? 4 : 0 }} />
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="h2 mb-4">Leads por etapa</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(LEAD_STATUS).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <Link href={`/leads?status=${k}`} className="hover:text-indigo-700">{v}</Link>
                <span className="tabular-nums font-medium">{leadStats.find((l) => l.status === k)?.count ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  )
}
