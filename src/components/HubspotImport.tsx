'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import type { Stage } from '@/lib/data'
import { LEAD_STATUS } from '@/lib/lead-status'
import { importDeals, importLeads, type ImportDeal, type ImportLead, type StageMapping } from '@/app/import-actions'

type Row = Record<string, string>
const pick = (r: Row, keys: string[]) => {
  for (const k of keys) if (r[k]?.trim()) return r[k].trim()
  return null
}
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const H = {
  id: ['ID do registro', 'Record ID'],
  dealName: ['Nome do negócio', 'Deal Name'],
  stage: ['Etapa do negócio', 'Deal Stage'],
  amount: ['Valor', 'Amount'],
  close: ['Data de fechamento', 'Close Date'],
  leadName: ['Nome do lead', 'Lead Name'],
  first: ['Nome', 'First Name'],
  last: ['Sobrenome', 'Last Name'],
  email: ['E-mail', 'Email'],
  phone: ['Número de telefone', 'Telefone', 'Phone Number', 'Mobile Phone Number'],
  company: ['Nome da empresa', 'Empresa', 'Company Name', 'Associated Company'],
  source: ['Fonte de leads', 'Fonte original', 'Original Source', 'Lead Source'],
  leadStatus: ['Etapa de lead', 'Status do lead', 'Lead Stage', 'Lead Status'],
}

// Palpites para etapas do HubSpot que não têm o mesmo nome das etapas locais
const SYNONYMS: Record<string, string> = {
  'formatacao da solucao': 'apresentacao',
  'desenvolvimento de proposta': 'formatacao de proposta',
  'apresentacao de proposta': 'negociacao',
}

function guess(hs: string, stages: Stage[]) {
  const n = norm(hs)
  if (n.includes('ganho') || n.includes('won')) return 'ganho'
  if (n.includes('perdido') || n.includes('lost')) return 'perdido'
  const target = SYNONYMS[n] ?? n
  return String(stages.find((s) => norm(s.name) === target)?.id ?? stages[0].id)
}

function leadStatus(s: string | null) {
  const n = norm(s ?? '')
  if (/realizad/.test(n)) return 'realizado'
  if (/agend/.test(n)) return 'agendado'
  if (/(estabelecido|connected)/.test(n)) return 'contato'
  if (/(tentativa|attempt)/.test(n)) return 'tentativa'
  if (/(unqualified|desqualif|descart|bad|ruim)/.test(n)) return 'descartado'
  if (/(qualif|convert)/.test(n)) return 'realizado'
  return 'novo'
}

export function HubspotImport({ stages }: { stages: Stage[] }) {
  const [deals, setDeals] = useState<ImportDeal[] | null>(null)
  const [leads, setLeads] = useState<ImportLead[] | null>(null)
  const [mapping, setMapping] = useState<StageMapping>({})
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function onFile(file: File) {
    setResult(null); setError(null); setDeals(null); setLeads(null)
    Papa.parse<Row>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const fields = meta.fields ?? []
        if (H.stage.some((h) => fields.includes(h))) {
          const rows = data.map((r): ImportDeal => {
            const title = pick(r, H.dealName) ?? 'Sem nome'
            return {
              hubspot_id: pick(r, H.id) ?? title, title,
              company: title.includes(' - ') ? title.split(' - ')[0].trim() : null,
              value: Number(pick(r, H.amount) ?? 0) || 0,
              stage: pick(r, H.stage) ?? '', close_date: pick(r, H.close),
            }
          })
          setDeals(rows)
          setMapping(Object.fromEntries([...new Set(rows.map((r) => r.stage))].map((s) => [s, guess(s, stages)])))
        } else if ([...H.leadName, ...H.email, ...H.first].some((h) => fields.includes(h))) {
          setLeads(data.map((r): ImportLead => {
            const name = pick(r, H.leadName) || [pick(r, H.first), pick(r, H.last)].filter(Boolean).join(' ') || pick(r, H.email) || 'Sem nome'
            return {
              hubspot_id: pick(r, H.id) ?? name, name, company: pick(r, H.company), email: pick(r, H.email),
              phone: pick(r, H.phone), source: pick(r, H.source), status: leadStatus(pick(r, H.leadStatus)),
            }
          }))
        } else {
          setError('Não reconheci o arquivo. Exporte "Negócios" ou "Contatos" do HubSpot em CSV.')
        }
      },
      error: (e) => setError(e.message),
    })
  }

  async function run() {
    setBusy(true); setError(null)
    try {
      const r = deals ? await importDeals(deals, mapping) : await importLeads(leads!)
      setResult(`${r.created} criados, ${r.updated} atualizados.`)
      setDeals(null); setLeads(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="space-y-4">
      <label className="card flex cursor-pointer flex-col items-center gap-1 border-dashed p-6 text-center hover:bg-slate-50">
        <span className="text-sm font-medium">Escolher CSV do HubSpot</span>
        <span className="text-xs text-slate-500">Negócios ou Contatos. Reimportar o mesmo arquivo atualiza sem duplicar.</span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">✓ {result}</p>}

      {deals && (
        <>
          <section className="card p-4">
            <h2 className="h2 mb-3">Mapear etapas</h2>
            <div className="space-y-2">
              {Object.keys(mapping).map((hs) => (
                <div key={hs} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <span>{hs || '(vazio)'} <span className="text-xs text-slate-400">({deals.filter((d) => d.stage === hs).length})</span></span>
                  <span className="text-slate-400">→</span>
                  <select className="input" value={mapping[hs]} onChange={(e) => setMapping({ ...mapping, [hs]: e.target.value })}>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="ganho">Fechado: ganho</option>
                    <option value="perdido">Fechado: perdido</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
          <section className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Negócio</th><th>Etapa</th><th className="text-right">Valor</th><th className="px-4">Fechamento</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((d) => (
                  <tr key={d.hubspot_id}><td className="px-4 py-2">{d.title}</td><td>{d.stage}</td><td className="text-right tabular-nums">{fmt(d.value)}</td><td className="px-4">{d.close_date?.slice(0, 10)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {leads && (
        <section className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Nome</th><th>Empresa</th><th>E-mail</th><th className="px-4">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => <tr key={l.hubspot_id}><td className="px-4 py-2">{l.name}</td><td>{l.company}</td><td>{l.email}</td><td className="px-4">{LEAD_STATUS[l.status]}</td></tr>)}
            </tbody>
          </table>
        </section>
      )}

      {(deals || leads) && (
        <button className="btn-primary" disabled={busy} onClick={run}>
          {busy ? 'Importando…' : `Importar ${deals?.length ?? leads?.length} ${deals ? 'negócios' : 'leads'}`}
        </button>
      )}
    </div>
  )
}
