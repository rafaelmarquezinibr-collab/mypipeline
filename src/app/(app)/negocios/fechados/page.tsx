import Link from 'next/link'
import { Suspense } from 'react'
import { getClosedDeals } from '@/lib/data'
import { fmtDate, fmtMoney } from '@/lib/dates'
import { Loading } from '@/components/Loading'

export default function ClosedPage() {
  return <Suspense fallback={<Loading />}><Closed /></Suspense>
}

async function Closed() {
  const deals = await getClosedDeals()
  return (
    <div className="space-y-4">
      <Link href="/pipeline" className="text-sm text-slate-500 hover:text-slate-700">← Pipeline</Link>
      <h1 className="h1">Ganhos e perdidos</h1>
      <div className="card divide-y divide-slate-100">
        {deals.map((d) => (
          <Link key={d.id} href={`/negocios/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-slate-500">{d.company} · {d.closed_at && fmtDate(d.closed_at)}{d.lost_reason && ` · ${d.lost_reason}`}</div>
            </div>
            <div className="text-right">
              <div className={d.status === 'ganho' ? 'font-medium text-emerald-700' : 'text-red-600'}>{d.status === 'ganho' ? 'Ganho' : 'Perdido'}</div>
              <div className="text-xs text-slate-500">{fmtMoney(d.value)}</div>
            </div>
          </Link>
        ))}
        {!deals.length && <p className="px-4 py-3 text-sm text-slate-400">Nenhum negócio fechado ainda.</p>}
      </div>
    </div>
  )
}
