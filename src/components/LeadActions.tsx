'use client'

import { useState } from 'react'
import { convertLead, deleteLead } from '@/app/actions'
import type { Lead, Stage } from '@/lib/data'
import { Modal } from './Modal'
import { ActionForm } from './ActionForm'
import { NextActionFields } from './NextActionFields'
import { SubmitButton } from './SubmitButton'
import { F, ReminderForm } from './Forms'

export function LeadActions({ lead, stages }: { lead: Lead; stages: Stage[] }) {
  const [open, setOpen] = useState<'convert' | 'task' | null>(null)
  const close = () => setOpen(null)
  return (
    <div className="flex flex-wrap gap-2">
      {lead.status !== 'convertido' && <button className="btn-primary" onClick={() => setOpen('convert')}>Converter em negócio</button>}
      <button className="btn-ghost" onClick={() => setOpen('task')}>+ Próxima ação</button>

      <Modal open={open === 'convert'} onClose={close} title="Converter em negócio">
        <ActionForm action={convertLead} className="space-y-3">
          <input type="hidden" name="lead_id" value={lead.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Nome do negócio" name="title" defaultValue={lead.company ?? lead.name} />
            <F label="Valor estimado (R$)" name="value" inputMode="decimal" />
          </div>
          <div>
            <label className="label">Etapa inicial</label>
            <select name="stage_id" className="input" defaultValue={stages[0]?.id}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <NextActionFields defaultTitle="Agendar reunião de descoberta" />
          <div className="flex justify-end"><SubmitButton>Converter</SubmitButton></div>
        </ActionForm>
      </Modal>
      <Modal open={open === 'task'} onClose={close} title="Nova ação"><ReminderForm leadId={lead.id} onDone={close} /></Modal>
    </div>
  )
}

export function DeleteLead({ id }: { id: number }) {
  return (
    <form action={deleteLead} onSubmit={(e) => { if (!confirm('Excluir este lead?')) e.preventDefault() }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-red-600 hover:underline">Excluir lead</button>
    </form>
  )
}
