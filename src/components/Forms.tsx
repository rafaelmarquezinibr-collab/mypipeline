'use client'

import { createDeal, createLead, createTask } from '@/app/actions'
import type { Stage } from '@/lib/data'
import { ActionForm } from './ActionForm'
import { NextActionFields } from './NextActionFields'
import { SubmitButton } from './SubmitButton'

export function LeadForm({ onDone }: { onDone: () => void }) {
  return (
    <ActionForm action={createLead} onDone={onDone} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Nome *" name="name" required />
        <F label="Empresa" name="company" />
        <F label="E-mail" name="email" type="email" />
        <F label="Telefone" name="phone" />
        <F label="Origem" name="source" placeholder="Indicação, LinkedIn, evento…" />
      </div>
      <div><label className="label">Notas</label><textarea name="notes" rows={2} className="input" /></div>
      <NextActionFields defaultTitle="Primeiro contato" />
      <div className="flex justify-end"><SubmitButton>Criar lead</SubmitButton></div>
    </ActionForm>
  )
}

export function DealForm({ stages, defaultStage, onDone }: { stages: Stage[]; defaultStage?: number; onDone: () => void }) {
  return (
    <ActionForm action={createDeal} onDone={onDone} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Nome do negócio *" name="title" required />
        <F label="Empresa" name="company" />
        <F label="Contato" name="contact_name" />
        <F label="Valor (R$)" name="value" inputMode="decimal" placeholder="0" />
        <div>
          <label className="label">Etapa *</label>
          <select name="stage_id" className="input" defaultValue={defaultStage ?? stages[0]?.id} required>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <F label="Previsão de fechamento" name="expected_close" type="date" />
      </div>
      <NextActionFields />
      <div className="flex justify-end"><SubmitButton>Criar negócio</SubmitButton></div>
    </ActionForm>
  )
}

export function ReminderForm({ onDone, dealId, leadId }: { onDone: () => void; dealId?: number; leadId?: number }) {
  return (
    <ActionForm action={async (fd) => {
      fd.set('title', String(fd.get('next_title')))
      fd.set('due', String(fd.get('next_due')))
      await createTask(fd)
    }} onDone={onDone} className="space-y-3">
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      <NextActionFields />
      <div className="flex justify-end"><SubmitButton>Agendar</SubmitButton></div>
    </ActionForm>
  )
}

export function F({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div><label className="label">{label}</label><input className="input" {...props} /></div>
}
