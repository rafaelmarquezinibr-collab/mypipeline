import Link from 'next/link'
import { Suspense } from 'react'
import { getOpenDeals, getStages } from '@/lib/data'
import { fmtMoney } from '@/lib/dates'
import { Kanban } from '@/components/Kanban'
import { Loading } from '@/components/Loading'

export default function PipelinePage() {
  return <Suspense fallback={<Loading />}><Pipeline /></Suspense>
}

async function Pipeline() {
  const [stages, deals] = await Promise.all([getStages(), getOpenDeals()])
  const total = deals.reduce((a, d) => a + d.value, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="h1">Pipeline</h1>
          <p className="text-sm text-slate-500">{deals.length} negócios abertos · {fmtMoney(total)}</p>
        </div>
        <Link href="/negocios/fechados" className="btn-ghost">Ganhos e perdidos</Link>
      </div>
      <Kanban stages={stages} deals={deals} />
    </div>
  )
}
