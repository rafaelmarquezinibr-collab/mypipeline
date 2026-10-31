'use client'

import { useState } from 'react'
import type { Stage } from '@/lib/data'
import { Modal } from './Modal'
import { DealForm, LeadForm, ReminderForm } from './Forms'

type Kind = 'lead' | 'deal' | 'task' | null

export function QuickAdd({ stages }: { stages: Stage[] }) {
  const [kind, setKind] = useState<Kind>(null)
  const close = () => setKind(null)
  return (
    <div className="flex gap-2">
      <button className="btn-ghost" onClick={() => setKind('task')}>+ Lembrete</button>
      <button className="btn-ghost" onClick={() => setKind('lead')}>+ Lead</button>
      <button className="btn-primary" onClick={() => setKind('deal')}>+ Negócio</button>
      <Modal open={kind === 'lead'} onClose={close} title="Novo lead"><LeadForm onDone={close} /></Modal>
      <Modal open={kind === 'deal'} onClose={close} title="Novo negócio"><DealForm stages={stages} onDone={close} /></Modal>
      <Modal open={kind === 'task'} onClose={close} title="Lembrete avulso"><ReminderForm onDone={close} /></Modal>
    </div>
  )
}
