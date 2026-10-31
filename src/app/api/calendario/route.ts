import { sql } from '@/lib/db'

/**
 * Feed iCalendar das próximas ações. No Outlook: Adicionar calendário > Assinar da Web,
 * colando a URL /api/calendario?token=<CALENDAR_TOKEN>.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!process.env.CALENDAR_TOKEN || token !== process.env.CALENDAR_TOKEN) {
    return new Response('Não autorizado', { status: 401 })
  }
  const tasks = await sql<{ id: number; title: string; due_at: Date; deal_id: number | null; lead_id: number | null; ref: string | null }[]>`
    select t.id, t.title, t.due_at, t.deal_id, t.lead_id, coalesce(d.title, l.name) as ref
    from tasks t left join deals d on d.id = t.deal_id left join leads l on l.id = t.lead_id
    where t.done_at is null and t.due_at > now() - interval '30 days'
    order by t.due_at`
  const stamp = ics(new Date())
  const base = process.env.APP_URL ?? ''
  const events = tasks.map((t) => {
    const end = new Date(t.due_at.getTime() + 30 * 60_000)
    const url = `${base}${t.deal_id ? `/negocios/${t.deal_id}` : t.lead_id ? `/leads/${t.lead_id}` : '/'}`
    return [
      'BEGIN:VEVENT',
      `UID:tarefa-${t.id}@funil`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${ics(t.due_at)}`,
      `DTEND:${ics(end)}`,
      `SUMMARY:${text(t.ref ? `${t.title} · ${t.ref}` : t.title)}`,
      `DESCRIPTION:${text(url)}`,
      `URL:${url}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', `DESCRIPTION:${text(t.title)}`, 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n')
  })
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Funil de Vendas//PT-BR', 'X-WR-CALNAME:Funil de vendas',
    'X-PUBLISHED-TTL:PT1H', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', ...events, 'END:VCALENDAR'].join('\r\n')
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } })
}

const ics = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
