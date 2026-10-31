import 'server-only'
import { sql } from './db'
import { notify, type Message } from './notify'
import { fmtDateTime } from './dates'

type Row = { id: number; title: string; due_at: Date; deal_id: number | null; lead_id: number | null; ref: string | null }

const label = (t: Row) => `${t.title}${t.ref ? ` · ${t.ref}` : ''}`
const link = (t: Row) => (t.deal_id ? `/negocios/${t.deal_id}` : t.lead_id ? `/leads/${t.lead_id}` : '/')

/** Hora atual em Brasília (0-23) e data AAAA-MM-DD. */
function nowBR() {
  const d = new Date(Date.now() - 3 * 3600_000)
  return { hour: d.getUTCHours(), day: d.toISOString().slice(0, 10) }
}

/**
 * Roda a cada poucos minutos (cron). Envia:
 * 1. aviso antes do horário de cada ação;
 * 2. cobrança de ações atrasadas a cada 3h, das 8h às 20h;
 * 3. resumo diário no horário configurado.
 */
export async function runReminders() {
  const settings = Object.fromEntries(
    (await sql<{ key: string; value: string }[]>`select key, value from settings`).map((r) => [r.key, r.value]),
  )
  const before = Number(settings.remind_minutes_before ?? 30)
  const { hour, day } = nowBR()
  const sent: Record<string, unknown> = {}

  const taskRef = sql`select t.id, t.title, t.due_at, t.deal_id, t.lead_id,
      coalesce(d.title, l.name) as ref
    from tasks t left join deals d on d.id = t.deal_id left join leads l on l.id = t.lead_id`

  // 1. Chegando
  const upcoming = await sql<Row[]>`${taskRef}
    where t.done_at is null and t.notified_at is null
      and t.due_at <= now() + make_interval(mins => ${before}) and t.due_at >= now() - interval '1 hour'
    order by t.due_at`
  if (upcoming.length) {
    const msg: Message =
      upcoming.length === 1
        ? { title: `⏰ ${fmtDateTime(upcoming[0].due_at)} ${upcoming[0].title}`, body: label(upcoming[0]), url: link(upcoming[0]) }
        : { title: `⏰ ${upcoming.length} ações chegando`, body: upcoming.map((t) => `• ${fmtDateTime(t.due_at)} ${label(t)}`).join('\n'), url: '/' }
    sent.upcoming = await notify(msg)
    await sql`update tasks set notified_at = now() where id in ${sql(upcoming.map((t) => t.id))}`
  }

  // 2. Atrasadas (horário comercial, no máximo a cada 3h)
  if (hour >= 8 && hour < 20) {
    const overdue = await sql<Row[]>`${taskRef}
      where t.done_at is null and t.due_at < now() - interval '15 minutes'
        and (t.overdue_notified_at is null or t.overdue_notified_at < now() - interval '3 hours')
      order by t.due_at`
    if (overdue.length) {
      sent.overdue = await notify({
        title: `🔴 ${overdue.length} ${overdue.length === 1 ? 'ação atrasada' : 'ações atrasadas'}`,
        body: overdue.map((t) => `• ${fmtDateTime(t.due_at)} ${label(t)}`).join('\n'),
        url: overdue.length === 1 ? link(overdue[0]) : '/',
      })
      await sql`update tasks set overdue_notified_at = now() where id in ${sql(overdue.map((t) => t.id))}`
    }
  }

  // 3. Resumo diário
  const digestHour = Number(settings.daily_digest_hour ?? 8)
  if (hour >= digestHour && settings.last_digest !== day) {
    sent.digest = await notify(await buildDigest())
    await sql`insert into settings (key, value) values ('last_digest', ${day})
              on conflict (key) do update set value = excluded.value`
  }
  return sent
}

export async function buildDigest(): Promise<Message> {
  const [[c], noNext, stale] = await Promise.all([
    sql<{ today: number; overdue: number }[]>`
      select count(*) filter (where due_at < now())::int as overdue,
             count(*) filter (where due_at >= now() and due_at < date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' + interval '1 day')::int as today
      from tasks where done_at is null`,
    sql<{ title: string }[]>`select d.title from deals d where d.status = 'aberto'
      and not exists (select 1 from tasks where deal_id = d.id and done_at is null)`,
    sql<{ title: string; name: string }[]>`select d.title, s.name from deals d join stages s on s.id = d.stage_id
      where d.status = 'aberto' and d.stage_entered_at < now() - make_interval(days => s.max_days)`,
  ])
  const lines = [`${c.today} ações para hoje`, `${c.overdue} atrasadas`]
  if (noNext.length) lines.push('', `⚠️ Sem próxima ação (${noNext.length}):`, ...noNext.map((d) => `• ${d.title}`))
  if (stale.length) lines.push('', `🐢 Parados na etapa (${stale.length}):`, ...stale.map((d) => `• ${d.title} (${d.name})`))
  return { title: '☀️ Seu funil hoje', body: lines.join('\n'), url: '/' }
}
