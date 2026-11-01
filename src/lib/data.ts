import 'server-only'
import { sql } from './db'
import { requireAuth } from './auth'

export type Stage = { id: number; name: string; position: number; max_days: number; color: string }

export type Lead = {
  id: number; name: string; company: string | null; email: string | null; phone: string | null
  source: string | null; status: string; notes: string | null; created_at: Date; hubspot_id: string | null
  next_task_at: Date | null; next_task_title: string | null
}

export type Deal = {
  id: number; title: string; company: string | null; contact_name: string | null
  email: string | null; phone: string | null; value: number; stage_id: number; status: string
  lost_reason: string | null; lead_id: number | null; expected_close: Date | null; notes: string | null
  stage_entered_at: Date; closed_at: Date | null; created_at: Date
  stage_name: string; stage_max_days: number; stage_color: string
  next_task_id: number | null; next_task_at: Date | null; next_task_title: string | null
}

export type Task = {
  id: number; title: string; due_at: Date; done_at: Date | null
  deal_id: number | null; lead_id: number | null
  /** canais de lembrete escolhidos ('email,whatsapp'); null = padrão dos Ajustes */
  channels: string | null
  deal_title: string | null; lead_name: string | null; company: string | null
  /** true quando é a única ação aberta de um negócio aberto: concluir exige a próxima */
  must_next: boolean
}

export type Note = { id: number; body: string; created_at: Date }

export { LEAD_STATUS } from './lead-status'

export async function getStages() {
  await requireAuth()
  return sql<Stage[]>`select * from stages order by position`
}

const dealSelect = sql`
  select d.*, s.name as stage_name, s.max_days as stage_max_days, s.color as stage_color,
         t.id as next_task_id, t.due_at as next_task_at, t.title as next_task_title
  from deals d
  join stages s on s.id = d.stage_id
  left join lateral (
    select id, due_at, title from tasks
    where deal_id = d.id and done_at is null order by due_at limit 1
  ) t on true`

export async function getOpenDeals() {
  await requireAuth()
  return sql<Deal[]>`${dealSelect} where d.status = 'aberto' order by t.due_at nulls first, d.created_at`
}

export async function getClosedDeals() {
  await requireAuth()
  return sql<Deal[]>`${dealSelect} where d.status <> 'aberto' order by d.closed_at desc limit 100`
}

export async function getDeal(id: number) {
  await requireAuth()
  const [deal] = await sql<Deal[]>`${dealSelect} where d.id = ${id}`
  if (!deal) return null
  const [tasks, notes, history] = await Promise.all([
    sql<Task[]>`select t.*, null as deal_title, null as lead_name, null as company, (t.deal_id is not null and t.done_at is null
   and (select status from deals where id = t.deal_id) = 'aberto'
   and (select count(*) from tasks x where x.deal_id = t.deal_id and x.done_at is null) = 1) as must_next
                from tasks t where deal_id = ${id} order by done_at nulls first, due_at`,
    sql<Note[]>`select id, body, created_at from notes where deal_id = ${id} order by created_at desc`,
    sql<{ changed_at: Date; from_name: string | null; to_name: string | null }[]>`
      select h.changed_at, f.name as from_name, t.name as to_name
      from stage_history h left join stages f on f.id = h.from_stage_id left join stages t on t.id = h.to_stage_id
      where h.deal_id = ${id} order by h.changed_at desc`,
  ])
  return { deal, tasks, notes, history }
}

export async function getLeads() {
  await requireAuth()
  return sql<Lead[]>`
    select l.*, t.due_at as next_task_at, t.title as next_task_title
    from leads l
    left join lateral (
      select due_at, title from tasks where lead_id = l.id and done_at is null order by due_at limit 1
    ) t on true
    order by (l.status in ('descartado','convertido')), t.due_at nulls first, l.created_at desc`
}

export async function getLead(id: number) {
  await requireAuth()
  const [lead] = await sql<Lead[]>`select *, null as next_task_at, null as next_task_title from leads where id = ${id}`
  if (!lead) return null
  const [tasks, notes, deals] = await Promise.all([
    sql<Task[]>`select t.*, null as deal_title, null as lead_name, null as company, false as must_next
                from tasks t where lead_id = ${id} order by done_at nulls first, due_at`,
    sql<Note[]>`select id, body, created_at from notes where lead_id = ${id} order by created_at desc`,
    sql<{ id: number; title: string }[]>`select id, title from deals where lead_id = ${id}`,
  ])
  return { lead, tasks, notes, deals }
}

const taskSelect = sql`
  select t.*, d.title as deal_title, l.name as lead_name, coalesce(d.company, l.company) as company,
  (t.deal_id is not null and t.done_at is null
   and (select status from deals where id = t.deal_id) = 'aberto'
   and (select count(*) from tasks x where x.deal_id = t.deal_id and x.done_at is null) = 1) as must_next
  from tasks t left join deals d on d.id = t.deal_id left join leads l on l.id = t.lead_id`

/** Tudo o que a tela "Hoje" precisa. */
export async function getToday() {
  await requireAuth()
  const [tasks, dealsWithoutNext, staleDeals, leadsWithoutNext] = await Promise.all([
    sql<Task[]>`${taskSelect}
      where t.done_at is null and t.due_at < now() + interval '7 days'
      order by t.due_at`,
    sql<Deal[]>`${dealSelect} where d.status = 'aberto' and t.id is null order by d.created_at`,
    sql<Deal[]>`${dealSelect}
      where d.status = 'aberto' and d.stage_entered_at < now() - make_interval(days => s.max_days)
      order by d.stage_entered_at`,
    sql<Lead[]>`select l.*, null as next_task_at, null as next_task_title from leads l
      where l.status not in ('descartado','convertido')
        and not exists (select 1 from tasks where lead_id = l.id and done_at is null)
      order by l.created_at desc`,
  ])
  return { tasks, dealsWithoutNext, staleDeals, leadsWithoutNext }
}

export async function getDashboard() {
  await requireAuth()
  const [byStage, reached, avgDays, results, monthly, leadStats] = await Promise.all([
    sql<{ id: number; name: string; color: string; max_days: number; count: number; total: number; stale: number }[]>`
      select s.id, s.name, s.color, s.max_days,
             count(d.id)::int as count, coalesce(sum(d.value), 0)::float as total,
             count(d.id) filter (where d.stage_entered_at < now() - make_interval(days => s.max_days))::int as stale
      from stages s left join deals d on d.stage_id = s.id and d.status = 'aberto'
      group by s.id order by s.position`,
    // Quantos negócios chegaram a cada etapa (ou além), para a conversão etapa a etapa
    sql<{ id: number; reached: number }[]>`
      select s.id, count(distinct x.deal_id)::int as reached
      from stages s left join (
        select h.deal_id, max(st.position) as maxpos
        from stage_history h join stages st on st.id = h.to_stage_id group by h.deal_id
      ) x on x.maxpos >= s.position
      group by s.id order by s.position`,
    // Tempo médio (dias) em cada etapa, considerando a passagem completa ou a permanência atual
    sql<{ id: number; avg_days: number | null }[]>`
      with spans as (
        select h.to_stage_id as stage_id,
               extract(epoch from (coalesce(lead(h.changed_at) over w,
                 case when d.status = 'aberto' then now() else d.closed_at end) - h.changed_at)) / 86400 as days
        from stage_history h join deals d on d.id = h.deal_id
        window w as (partition by h.deal_id order by h.changed_at)
      )
      select s.id, round(avg(greatest(sp.days, 0))::numeric, 1)::float as avg_days
      from stages s left join spans sp on sp.stage_id = s.id group by s.id order by s.position`,
    sql<{ status: string; count: number; total: number }[]>`
      select status, count(*)::int as count, coalesce(sum(value), 0)::float as total
      from deals where status <> 'aberto' and closed_at > now() - interval '90 days' group by status`,
    sql<{ month: string; won: number; lost: number }[]>`
      select to_char(m, 'MM/YY') as month,
             coalesce(sum(d.value) filter (where d.status = 'ganho'), 0)::float as won,
             count(d.id) filter (where d.status = 'perdido')::int as lost
      from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
      left join deals d on date_trunc('month', d.closed_at) = m
      group by m order by m`,
    sql<{ status: string; count: number }[]>`select status, count(*)::int as count from leads group by status`,
  ])
  return { byStage, reached, avgDays, results, monthly, leadStats }
}

export async function getSettings() {
  await requireAuth()
  const rows = await sql<{ key: string; value: string }[]>`select key, value from settings`
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>
}
