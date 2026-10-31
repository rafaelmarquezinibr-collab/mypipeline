'use client'

import Link from 'next/link'
import { useOptimistic, useState, startTransition } from 'react'
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import type { Deal, Stage } from '@/lib/data'
import { moveDeal } from '@/app/actions'
import { Modal } from './Modal'
import { ActionForm } from './ActionForm'
import { NextActionFields } from './NextActionFields'
import { SubmitButton } from './SubmitButton'
import { DealForm } from './Forms'

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const days = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)

export function Kanban({ stages, deals }: { stages: Stage[]; deals: Deal[] }) {
  const [moving, setMoving] = useState<{ deal: Deal; stage: Stage } | null>(null)
  const [creating, setCreating] = useState<number | null>(null)
  const [optimistic, setOptimistic] = useOptimistic(deals, (state, m: { id: number; stage_id: number }) =>
    state.map((d) => (d.id === m.id ? { ...d, stage_id: m.stage_id } : d)))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  function onDragEnd(e: DragEndEvent) {
    const deal = deals.find((d) => d.id === Number(e.active.id))
    const stage = stages.find((s) => s.id === Number(e.over?.id))
    if (deal && stage && deal.stage_id !== stage.id) setMoving({ deal, stage })
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {stages.map((s) => {
            const items = optimistic.filter((d) => d.stage_id === s.id)
            return (
              <Column key={s.id} stage={s} count={items.length} total={items.reduce((a, d) => a + d.value, 0)} onAdd={() => setCreating(s.id)}>
                {items.map((d) => <Card key={d.id} deal={d} stages={stages} onMove={(stage) => setMoving({ deal: d, stage })} />)}
              </Column>
            )
          })}
        </div>
      </DndContext>

      <Modal open={!!moving} onClose={() => setMoving(null)} title={moving ? `Mover para ${moving.stage.name}` : ''}>
        {moving && (
          <ActionForm
            action={async (fd) => {
              startTransition(() => setOptimistic({ id: moving.deal.id, stage_id: moving.stage.id }))
              await moveDeal(fd)
            }}
            onDone={() => setMoving(null)} className="space-y-4">
            <input type="hidden" name="deal_id" value={moving.deal.id} />
            <input type="hidden" name="stage_id" value={moving.stage.id} />
            <p className="text-sm text-slate-600"><b>{moving.deal.title}</b> vai para <b>{moving.stage.name}</b>. Qual o próximo passo?</p>
            <NextActionFields />
            {moving.deal.next_task_id && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="complete_open" defaultChecked /> Concluir as ações abertas da etapa anterior
              </label>
            )}
            <div className="flex justify-end"><SubmitButton>Mover</SubmitButton></div>
          </ActionForm>
        )}
      </Modal>

      <Modal open={creating !== null} onClose={() => setCreating(null)} title="Novo negócio">
        <DealForm stages={stages} defaultStage={creating ?? undefined} onDone={() => setCreating(null)} />
      </Modal>
    </>
  )
}

function Column({ stage, count, total, onAdd, children }: { stage: Stage; count: number; total: number; onAdd: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div ref={setNodeRef} className={`flex w-72 shrink-0 snap-start flex-col rounded-xl bg-slate-100/80 p-2 transition ${isOver ? 'ring-2 ring-indigo-400' : ''}`}>
      <div className="mb-2 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
          <span className="text-sm font-semibold">{stage.name}</span>
          <span className="ml-auto text-xs text-slate-500">{count}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{money(total)}</div>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2">{children}</div>
      <button onClick={onAdd} className="mt-2 rounded-lg py-1.5 text-xs text-slate-500 hover:bg-white">+ Adicionar</button>
    </div>
  )
}

function Card({ deal, stages, onMove }: { deal: Deal; stages: Stage[]; onMove: (s: Stage) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const overdue = deal.next_task_at && new Date(deal.next_task_at) < new Date()
  const inStage = days(deal.stage_entered_at)
  const stale = inStage > deal.stage_max_days
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`card touch-manipulation p-3 text-left ${isDragging ? 'z-30 rotate-1 shadow-lg' : ''}`}>
      <Link href={`/negocios/${deal.id}`} className="block text-sm font-medium hover:text-indigo-700">{deal.title}</Link>
      {deal.company && deal.company !== deal.title && <div className="text-xs text-slate-500">{deal.company}</div>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{money(deal.value)}</span>
        <span className={stale ? 'font-medium text-amber-600' : 'text-slate-400'} title="Dias nesta etapa">{inStage}d{stale && ' 🐢'}</span>
      </div>
      <div className={`mt-2 rounded-md px-2 py-1 text-xs ${!deal.next_task_at ? 'bg-amber-50 text-amber-700' : overdue ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
        {deal.next_task_at
          ? <>{overdue ? '🔴 ' : '→ '}{deal.next_task_title} · {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(deal.next_task_at))}</>
          : '⚠️ Sem próxima ação'}
      </div>
      <select aria-label="Mover para" value="" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => { const s = stages.find((x) => x.id === Number(e.target.value)); if (s) onMove(s) }}
        className="mt-2 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500">
        <option value="">Mover para…</option>
        {stages.filter((s) => s.id !== deal.stage_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  )
}
