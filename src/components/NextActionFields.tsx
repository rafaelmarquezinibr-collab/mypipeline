'use client'

import { useState } from 'react'

// Hora de Brasília (UTC-3 fixo) formatada para datetime-local
function br(d: Date) {
  return new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 16)
}
function at(daysAhead: number, hour: number) {
  const nowBR = new Date(Date.now() - 3 * 3600_000)
  nowBR.setUTCDate(nowBR.getUTCDate() + daysAhead)
  nowBR.setUTCHours(hour, 0, 0, 0)
  return nowBR.toISOString().slice(0, 16)
}
function nextMonday() {
  const dow = new Date(Date.now() - 3 * 3600_000).getUTCDay()
  return at(((8 - dow) % 7) || 7, 9)
}

const presets = [
  { label: 'Em 1h', value: () => br(new Date(Date.now() + 3600_000)) },
  { label: 'Amanhã 9h', value: () => at(1, 9) },
  { label: 'Em 2 dias', value: () => at(2, 9) },
  { label: 'Seg. 9h', value: nextMonday },
  { label: 'Em 1 semana', value: () => at(7, 9) },
]

const suggestions = ['Ligar', 'Enviar e-mail de follow-up', 'Mandar proposta', 'Agendar reunião', 'Cobrar retorno']

/**
 * Campos de "próxima ação" com atalhos de data. Nomes: next_title / next_due.
 * Os atalhos existem para que definir a próxima ação leve 2 cliques.
 */
export function NextActionFields({ required = true, prefix = 'next', defaultTitle = '' }: { required?: boolean; prefix?: string; defaultTitle?: string }) {
  const [due, setDue] = useState(at(1, 9))
  const [title, setTitle] = useState(defaultTitle)
  return (
    <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
      <div>
        <label className="label">Próxima ação {required && <span className="text-red-500">*</span>}</label>
        <input name={`${prefix}_title`} className="input" required={required} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para confirmar reunião" />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setTitle(s)} className="chip cursor-pointer bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Quando {required && <span className="text-red-500">*</span>}</label>
        <input type="datetime-local" name={`${prefix}_due`} className="input" required={required} value={due} onChange={(e) => setDue(e.target.value)} />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button key={p.label} type="button" onClick={() => setDue(p.value())} className="chip cursor-pointer bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">{p.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
