'use server'

import { refresh } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export type ImportDeal = {
  hubspot_id: string; title: string; company: string | null; value: number
  stage: string; close_date: string | null
}
export type ImportLead = {
  hubspot_id: string; name: string; company: string | null; email: string | null
  phone: string | null; source: string | null; status: string
}
/** etapa do HubSpot → id da etapa local, ou 'ganho' / 'perdido' */
export type StageMapping = Record<string, string>

// Datas do HubSpot vêm em hora local ("2026-11-30 11:40"); tratamos como Brasília
const brDate = (s: string) => new Date(`${s.replace(' ', 'T')}${s.length <= 10 ? 'T09:00' : ''}:00-03:00`)

export async function importDeals(rows: ImportDeal[], mapping: StageMapping) {
  await requireAuth()
  const stages = await sql<{ id: number }[]>`select id from stages order by position`
  const last = stages[stages.length - 1].id
  let created = 0, updated = 0
  await sql.begin(async (tx) => {
    for (const r of rows) {
      const m = mapping[r.stage] ?? String(stages[0].id)
      const status = m === 'ganho' || m === 'perdido' ? m : 'aberto'
      const stageId = status === 'aberto' ? Number(m) : last
      const close = r.close_date ? brDate(r.close_date) : null
      const [row] = await tx`
        insert into deals (hubspot_id, title, company, value, stage_id, status, expected_close, closed_at)
        values (${r.hubspot_id}, ${r.title}, ${r.company}, ${r.value}, ${stageId}, ${status},
                ${status === 'aberto' && close ? close.toISOString().slice(0, 10) : null},
                ${status !== 'aberto' ? close ?? new Date() : null})
        on conflict (hubspot_id) do update set
          title = excluded.title, company = excluded.company, value = excluded.value,
          expected_close = excluded.expected_close, updated_at = now()
        returning id, closed_at, (xmax = 0) as inserted`
      if (row.inserted) {
        created++
        await tx`insert into stage_history (deal_id, to_stage_id, changed_at)
                 values (${row.id}, ${stageId}, ${row.closed_at ?? new Date()})`
      } else updated++
    }
  })
  refresh()
  return { created, updated }
}

export async function importLeads(rows: ImportLead[]) {
  await requireAuth()
  let created = 0, updated = 0
  await sql.begin(async (tx) => {
    for (const r of rows) {
      const [row] = await tx`
        insert into leads (hubspot_id, name, company, email, phone, source, status)
        values (${r.hubspot_id}, ${r.name}, ${r.company}, ${r.email}, ${r.phone}, ${r.source}, ${r.status})
        on conflict (hubspot_id) do update set
          name = excluded.name, company = excluded.company, email = excluded.email, phone = excluded.phone,
          source = excluded.source, updated_at = now()
        returning (xmax = 0) as inserted`
      if (row.inserted) created++
      else updated++
    }
  })
  refresh()
  return { created, updated }
}
