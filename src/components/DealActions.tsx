'use client'

import { useState } from 'react'
import { closeDeal, deleteDeal, moveDeal, reopenDeal } from '@/app/actions'
import type { Deal, Stage } from '@/lib/data'
import { Modal } from './Modal'
import { ActionForm } from './ActionForm'
import { NextActionFields } from './NextActionFields'
import { SubmitButton } from './SubmitButton'
import { ReminderForm } from './Forms'

type Open = 'move' | 'won' | 'lost' | 'reopen' | 'task' | null

export function DealActions({ deal, stages }: { deal: Deal; stages: Stage[] }) {
  const [open, setOpen] = useState<Open>(null)
  const [target, setTarget] = useState<number>(() => {
    const i = stages.findIndex((s) => s.id === deal.stage_id)
    return stages[Math.min(i + 1, stages.length - 1)]?.id
  })
  const close = () => setOpen(null)
  const isOpen = deal.status === 'aberto'
  return (
    <div className="flex flex-wrap gap-2">
      {isOpen ? (
        <>
          <button className="btn-primary" onClick={() => setOpen('move')}>Avançar etapa</button>
          <button className="btn-ghost" onClick={() => setOpen('task')}>+ Próxima ação</button>
          <button className="btn-ghost text-emerald-700" onClick={() => setOpen('won')}>✓ Ganho</button>
          <button className="btn-ghost text-red-600" onClick={() => setOpen('lost')}>✕ Perdido</button>
        </>
      ) : (
        <button className="btn-ghost" onClick={() => setOpen('reopen')}>Reabrir negócio</button>
      )}

      <Modal open={open === 'move'} onClose={close} title="Mudar etapa">
        <ActionForm action={moveDeal} onDone={close} className="space-y-4">
          <input type="hidden" name="deal_id" value={deal.id} />
          <div>
            <label className="label">Nova etapa</label>
            <select name="stage_id" className="input" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === deal.stage_id ? ' (atual)' : ''}</option>)}
            </select>
          </div>
          <NextActionFields />
          {deal.next_task_id && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="complete_open" defaultChecked /> Concluir as ações abertas
            </label>
          )}
          <div className="flex justify-end"><SubmitButton>Salvar</SubmitButton></div>
        </ActionForm>
      </Modal>

      <Modal open={open === 'task'} onClose={close} title="Nova ação"><ReminderForm dealId={deal.id} onDone={close} /></Modal>

      <Modal open={open === 'won'} onClose={close} title="Marcar como ganho 🎉">
        <ActionForm action={closeDeal} onDone={close} className="space-y-4">
          <input type="hidden" name="deal_id" value={deal.id} />
          <input type="hidden" name="status" value="ganho" />
          <p className="text-sm text-slate-600">As ações abertas serão concluídas.</p>
          <div className="flex justify-end"><SubmitButton>Confirmar</SubmitButton></div>
        </ActionForm>
      </Modal>

      <Modal open={open === 'lost'} onClose={close} title="Marcar como perdido">
        <ActionForm action={closeDeal} onDone={close} className="space-y-4">
          <input type="hidden" name="deal_id" value={deal.id} />
          <input type="hidden" name="status" value="perdido" />
          <div>
            <label className="label">Motivo</label>
            <select name="lost_reason" className="input" defaultValue="">
              <option value="">Selecione…</option>
              {['Preço', 'Timing', 'Escolheu concorrente', 'Sem orçamento', 'Sem resposta', 'Não era fit', 'Outro'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end"><SubmitButton className="btn-danger">Confirmar</SubmitButton></div>
        </ActionForm>
      </Modal>

      <Modal open={open === 'reopen'} onClose={close} title="Reabrir negócio">
        <ActionForm action={reopenDeal} onDone={close} className="space-y-4">
          <input type="hidden" name="deal_id" value={deal.id} />
          <NextActionFields />
          <div className="flex justify-end"><SubmitButton>Reabrir</SubmitButton></div>
        </ActionForm>
      </Modal>
    </div>
  )
}

export function DeleteDeal({ id }: { id: number }) {
  return (
    <form action={deleteDeal} onSubmit={(e) => { if (!confirm('Excluir este negócio e todo o histórico?')) e.preventDefault() }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-red-600 hover:underline">Excluir negócio</button>
    </form>
  )
}
