'use client'

import Link from 'next/link'
import { useState } from 'react'
import { completeTask, deleteTask, snoozeTask } from '@/app/actions'
import type { Task } from '@/lib/data'
import { Modal } from './Modal'
import { ActionForm } from './ActionForm'
import { NextActionFields } from './NextActionFields'
import { SubmitButton } from './SubmitButton'

function when(d: Date) {
  const date = new Date(d)
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(date)
  const day = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(x)
  const today = day(new Date())
  const tomorrow = day(new Date(Date.now() + 86_400_000))
  const hm = fmt({ hour: '2-digit', minute: '2-digit' })
  if (day(date) === today) return `Hoje ${hm}`
  if (day(date) === tomorrow) return `Amanhã ${hm}`
  return `${fmt({ weekday: 'short', day: '2-digit', month: '2-digit' })} ${hm}`
}

export function TaskItem({ task, showRef = true }: { task: Task; showRef?: boolean }) {
  const [completing, setCompleting] = useState(false)
  const [snoozing, setSnoozing] = useState(false)
  const done = Boolean(task.done_at)
  const overdue = !done && new Date(task.due_at) < new Date()
  const ref = task.deal_id
    ? { href: `/negocios/${task.deal_id}`, label: task.deal_title }
    : task.lead_id ? { href: `/leads/${task.lead_id}`, label: task.lead_name } : null

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${done ? 'opacity-50' : ''}`}>
      <button type="button" disabled={done} onClick={() => setCompleting(true)} aria-label="Concluir"
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${done ? 'border-emerald-500 bg-emerald-500' : overdue ? 'border-red-400 hover:bg-red-50' : 'border-slate-300 hover:border-indigo-500'}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${done ? 'line-through' : ''}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className={overdue ? 'font-semibold text-red-600' : ''}>{overdue && 'Atrasada · '}{when(task.due_at)}</span>
          {task.channels && <span title="Lembrete por">{task.channels.split(',').map((c) => ({ whatsapp: '💬', email: '📧', push: '📱' })[c]).join(' ')}</span>}
          {showRef && ref && (
            <Link href={ref.href} className="truncate text-indigo-600 hover:underline">
              {ref.label}{task.company && task.company !== ref.label ? ` · ${task.company}` : ''}
            </Link>
          )}
        </div>
      </div>
      {!done && (
        <div className="flex shrink-0 gap-1">
          <form action={snoozeTask}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="minutes" value={60} />
            <button className="btn-ghost btn-sm" title="Adiar 1 hora">+1h</button>
          </form>
          <button type="button" onClick={() => setSnoozing(true)} className="btn-ghost btn-sm" title="Adiar">Adiar</button>
        </div>
      )}

      <Modal open={completing} onClose={() => setCompleting(false)} title="Concluir ação">
        <ActionForm action={completeTask} onDone={() => setCompleting(false)} className="space-y-4">
          <input type="hidden" name="id" value={task.id} />
          <p className="text-sm text-slate-600">{task.title}</p>
          <div>
            <label className="label">Como foi? (opcional, vira nota)</label>
            <textarea name="note" rows={2} className="input" placeholder="Ex.: Pediu proposta até sexta" />
          </div>
          {task.must_next && <p className="text-xs font-medium text-amber-700">Esta é a última ação do negócio. Defina a próxima para ele não ficar parado.</p>}
          <NextActionFields required={task.must_next} />
          <div className="flex justify-end gap-2">
            <SubmitButton>Concluir</SubmitButton>
          </div>
        </ActionForm>
      </Modal>

      <Modal open={snoozing} onClose={() => setSnoozing(false)} title="Adiar ação">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[{ l: '3 horas', m: 180 }, { l: '1 dia', m: 1440 }, { l: '3 dias', m: 4320 }].map((o) => (
              <ActionForm key={o.m} action={snoozeTask} onDone={() => setSnoozing(false)}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="minutes" value={o.m} />
                <button className="btn-ghost w-full">{o.l}</button>
              </ActionForm>
            ))}
          </div>
          <ActionForm action={snoozeTask} onDone={() => setSnoozing(false)} className="flex gap-2">
            <input type="hidden" name="id" value={task.id} />
            <input type="datetime-local" name="due" className="input" required />
            <SubmitButton>Mover</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteTask} onDone={() => setSnoozing(false)}>
            <input type="hidden" name="id" value={task.id} />
            <button className="text-xs text-red-600 hover:underline">Excluir esta ação</button>
          </ActionForm>
        </div>
      </Modal>
    </div>
  )
}
