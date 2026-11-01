'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SESSION_COOKIE, signSession } from '@/lib/session'
import { fromLocalInput } from '@/lib/dates'

const str = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const req = (fd: FormData, k: string) => {
  const v = str(fd, k)
  if (!v) throw new Error(`Campo obrigatório: ${k}`)
  return v
}
const int = (fd: FormData, k: string) => Number(req(fd, k))
const money = (fd: FormData, k: string) => {
  const v = str(fd, k)
  if (!v) return 0
  // aceita "12.500,00", "120.000" (milhar com ponto) e "12500.00"
  const br = v.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(v)
  const n = Number(br ? v.replace(/\./g, '').replace(',', '.') : v)
  return Number.isFinite(n) ? n : 0
}

/** Lê os campos next_title/next_due do formulário. A próxima ação é obrigatória. */
function nextAction(fd: FormData) {
  return { title: req(fd, 'next_title'), due: fromLocalInput(req(fd, 'next_due')), channels: channels(fd) }
}

/** Canais de lembrete marcados na ação; null = padrão dos Ajustes. */
function channels(fd: FormData) {
  const valid = ['push', 'email', 'whatsapp']
  const list = fd.getAll('next_channels').map(String).filter((c) => valid.includes(c))
  return list.length ? list.join(',') : null
}

// ---------- Login ----------

export async function login(_: unknown, fd: FormData) {
  // trim/NFC: valores colados no painel da Vercel ou digitados no celular podem trazer espaço ou acento em outra forma
  const clean = (s: string) => s.normalize('NFC').trim()
  const typed = clean(String(fd.get('password') ?? ''))
  const given = Buffer.from(typed)
  const expected = Buffer.from(clean(process.env.APP_PASSWORD ?? ''))
  if (!expected.length) return { error: 'APP_PASSWORD não está configurada no servidor' }
  if (!process.env.SESSION_SECRET?.trim()) return { error: 'SESSION_SECRET não está configurada no servidor' }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { error: `Senha incorreta (você digitou ${[...typed].length} caracteres)` }
  }
  ;(await cookies()).set(SESSION_COOKIE, await signSession(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  redirect('/')
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}

// ---------- Leads ----------

export async function createLead(fd: FormData) {
  await requireAuth()
  const next = nextAction(fd)
  await sql.begin(async (tx) => {
    const [lead] = await tx`
      insert into leads (name, company, email, phone, source, notes)
      values (${req(fd, 'name')}, ${str(fd, 'company')}, ${str(fd, 'email')}, ${str(fd, 'phone')},
              ${str(fd, 'source')}, ${str(fd, 'notes')})
      returning id`
    await tx`insert into tasks (title, due_at, lead_id, channels) values (${next.title}, ${next.due}, ${lead.id}, ${next.channels})`
  })
  refresh()
}

export async function updateLead(fd: FormData) {
  await requireAuth()
  await sql`
    update leads set name = ${req(fd, 'name')}, company = ${str(fd, 'company')}, email = ${str(fd, 'email')},
      phone = ${str(fd, 'phone')}, source = ${str(fd, 'source')}, status = ${req(fd, 'status')},
      notes = ${str(fd, 'notes')}, updated_at = now()
    where id = ${int(fd, 'id')}`
  refresh()
}

export async function deleteLead(fd: FormData) {
  await requireAuth()
  await sql`delete from leads where id = ${int(fd, 'id')}`
  redirect('/leads')
}

/** Converte o lead em negócio na primeira etapa (ou na escolhida) e já agenda a próxima ação. */
export async function convertLead(fd: FormData) {
  await requireAuth()
  const leadId = int(fd, 'lead_id')
  const next = nextAction(fd)
  const dealId = await sql.begin(async (tx) => {
    const [lead] = await tx`select * from leads where id = ${leadId}`
    const stageId = str(fd, 'stage_id') ?? (await tx`select id from stages order by position limit 1`)[0].id
    const [deal] = await tx`
      insert into deals (title, company, contact_name, email, phone, value, stage_id, lead_id, notes)
      values (${str(fd, 'title') ?? lead.company ?? lead.name}, ${lead.company}, ${lead.name}, ${lead.email},
              ${lead.phone}, ${money(fd, 'value')}, ${stageId}, ${leadId}, ${lead.notes})
      returning id`
    await tx`insert into stage_history (deal_id, to_stage_id) values (${deal.id}, ${stageId})`
    await tx`update leads set status = 'convertido', updated_at = now() where id = ${leadId}`
    // tarefas abertas do lead passam para o negócio
    await tx`update tasks set deal_id = ${deal.id}, lead_id = null where lead_id = ${leadId} and done_at is null`
    await tx`insert into tasks (title, due_at, deal_id, channels) values (${next.title}, ${next.due}, ${deal.id}, ${next.channels})`
    return deal.id as number
  })
  redirect(`/negocios/${dealId}`)
}

// ---------- Negócios ----------

export async function createDeal(fd: FormData) {
  await requireAuth()
  const next = nextAction(fd)
  const stageId = int(fd, 'stage_id')
  await sql.begin(async (tx) => {
    const [deal] = await tx`
      insert into deals (title, company, contact_name, email, phone, value, stage_id, expected_close, notes)
      values (${req(fd, 'title')}, ${str(fd, 'company')}, ${str(fd, 'contact_name')}, ${str(fd, 'email')},
              ${str(fd, 'phone')}, ${money(fd, 'value')}, ${stageId}, ${str(fd, 'expected_close')}, ${str(fd, 'notes')})
      returning id`
    await tx`insert into stage_history (deal_id, to_stage_id) values (${deal.id}, ${stageId})`
    await tx`insert into tasks (title, due_at, deal_id, channels) values (${next.title}, ${next.due}, ${deal.id}, ${next.channels})`
  })
  refresh()
}

export async function updateDeal(fd: FormData) {
  await requireAuth()
  await sql`
    update deals set title = ${req(fd, 'title')}, company = ${str(fd, 'company')},
      contact_name = ${str(fd, 'contact_name')}, email = ${str(fd, 'email')}, phone = ${str(fd, 'phone')},
      value = ${money(fd, 'value')}, expected_close = ${str(fd, 'expected_close')}, notes = ${str(fd, 'notes')},
      updated_at = now()
    where id = ${int(fd, 'id')}`
  refresh()
}

/** Move o negócio de etapa. Exige a próxima ação, para nada ficar solto. */
export async function moveDeal(fd: FormData) {
  await requireAuth()
  const dealId = int(fd, 'deal_id')
  const stageId = int(fd, 'stage_id')
  const next = nextAction(fd)
  await sql.begin(async (tx) => {
    const [deal] = await tx`select stage_id from deals where id = ${dealId} for update`
    if (deal.stage_id !== stageId) {
      await tx`update deals set stage_id = ${stageId}, stage_entered_at = now(), updated_at = now() where id = ${dealId}`
      await tx`insert into stage_history (deal_id, from_stage_id, to_stage_id) values (${dealId}, ${deal.stage_id}, ${stageId})`
    }
    if (fd.get('complete_open') === 'on') {
      await tx`update tasks set done_at = now() where deal_id = ${dealId} and done_at is null`
    }
    await tx`insert into tasks (title, due_at, deal_id, channels) values (${next.title}, ${next.due}, ${dealId}, ${next.channels})`
  })
  refresh()
}

export async function closeDeal(fd: FormData) {
  await requireAuth()
  const dealId = int(fd, 'deal_id')
  const status = req(fd, 'status')
  if (status !== 'ganho' && status !== 'perdido') throw new Error('Status inválido')
  await sql.begin(async (tx) => {
    await tx`update deals set status = ${status}, lost_reason = ${str(fd, 'lost_reason')}, closed_at = now(),
             updated_at = now() where id = ${dealId}`
    await tx`update tasks set done_at = now() where deal_id = ${dealId} and done_at is null`
  })
  refresh()
}

export async function reopenDeal(fd: FormData) {
  await requireAuth()
  const dealId = int(fd, 'deal_id')
  const next = nextAction(fd)
  await sql.begin(async (tx) => {
    await tx`update deals set status = 'aberto', closed_at = null, lost_reason = null, stage_entered_at = now(),
             updated_at = now() where id = ${dealId}`
    await tx`insert into tasks (title, due_at, deal_id, channels) values (${next.title}, ${next.due}, ${dealId}, ${next.channels})`
  })
  refresh()
}

export async function deleteDeal(fd: FormData) {
  await requireAuth()
  await sql`delete from deals where id = ${int(fd, 'id')}`
  redirect('/pipeline')
}

// ---------- Próximas ações ----------

export async function createTask(fd: FormData) {
  await requireAuth()
  await sql`insert into tasks (title, due_at, deal_id, lead_id, channels)
            values (${req(fd, 'title')}, ${fromLocalInput(req(fd, 'due'))}, ${str(fd, 'deal_id')}, ${str(fd, 'lead_id')}, ${channels(fd)})`
  refresh()
}

/**
 * Conclui a ação. Se ela era a última de um negócio aberto, a próxima é obrigatória
 * (o formulário mostra os campos e o servidor confere).
 */
export async function completeTask(fd: FormData) {
  await requireAuth()
  const id = int(fd, 'id')
  await sql.begin(async (tx) => {
    const [task] = await tx`update tasks set done_at = now() where id = ${id} returning deal_id, lead_id`
    const nextTitle = str(fd, 'next_title')
    if (task.deal_id) {
      const [{ open, aberto }] = await tx`
        select (select count(*)::int from tasks where deal_id = ${task.deal_id} and done_at is null) as open,
               (select status = 'aberto' from deals where id = ${task.deal_id}) as aberto`
      if (aberto && open === 0 && !nextTitle) throw new Error('Defina a próxima ação do negócio')
    }
    if (nextTitle) {
      await tx`insert into tasks (title, due_at, deal_id, lead_id, channels)
               values (${nextTitle}, ${fromLocalInput(req(fd, 'next_due'))}, ${task.deal_id}, ${task.lead_id}, ${channels(fd)})`
    }
    const note = str(fd, 'note')
    if (note) await tx`insert into notes (body, deal_id, lead_id) values (${note}, ${task.deal_id}, ${task.lead_id})`
  })
  refresh()
}

/** Adia a ação. Zera os avisos para o lembrete disparar de novo no novo horário. */
export async function snoozeTask(fd: FormData) {
  await requireAuth()
  const id = int(fd, 'id')
  const custom = str(fd, 'due')
  if (custom) {
    await sql`update tasks set due_at = ${fromLocalInput(custom)}, notified_at = null, overdue_notified_at = null where id = ${id}`
  } else {
    const minutes = int(fd, 'minutes')
    await sql`update tasks set due_at = greatest(due_at, now()) + make_interval(mins => ${minutes}),
              notified_at = null, overdue_notified_at = null where id = ${id}`
  }
  refresh()
}

export async function deleteTask(fd: FormData) {
  await requireAuth()
  await sql`delete from tasks where id = ${int(fd, 'id')}`
  refresh()
}

// ---------- Notas ----------

export async function addNote(fd: FormData) {
  await requireAuth()
  await sql`insert into notes (body, deal_id, lead_id) values (${req(fd, 'body')}, ${str(fd, 'deal_id')}, ${str(fd, 'lead_id')})`
  refresh()
}

// ---------- Configurações ----------

export async function updateStage(fd: FormData) {
  await requireAuth()
  await sql`update stages set name = ${req(fd, 'name')}, max_days = ${int(fd, 'max_days')}, color = ${req(fd, 'color')}
            where id = ${int(fd, 'id')}`
  refresh()
}

export async function addStage(fd: FormData) {
  await requireAuth()
  await sql`insert into stages (name, position, max_days)
            values (${req(fd, 'name')}, (select coalesce(max(position), 0) + 1 from stages), ${Number(str(fd, 'max_days') ?? 7)})`
  refresh()
}

export async function moveStage(fd: FormData) {
  await requireAuth()
  const id = int(fd, 'id')
  const dir = req(fd, 'dir') === 'up' ? -1 : 1
  await sql.begin(async (tx) => {
    const stages = await tx`select id, position from stages order by position`
    const i = stages.findIndex((s) => s.id === id)
    const j = i + dir
    if (j < 0 || j >= stages.length) return
    await tx`update stages set position = ${stages[j].position} where id = ${stages[i].id}`
    await tx`update stages set position = ${stages[i].position} where id = ${stages[j].id}`
  })
  refresh()
}

export async function deleteStage(fd: FormData) {
  await requireAuth()
  const id = int(fd, 'id')
  const [{ n }] = await sql`select count(*)::int as n from deals where stage_id = ${id}`
  if (n > 0) throw new Error('Mova os negócios desta etapa antes de excluí-la')
  await sql`delete from stage_history where from_stage_id = ${id} or to_stage_id = ${id}`
  await sql`delete from stages where id = ${id}`
  refresh()
}

export async function saveSettings(fd: FormData) {
  await requireAuth()
  const channels = ['push', 'email', 'whatsapp'].filter((c) => fd.get(`ch_${c}`) === 'on').join(',')
  const values: Record<string, string> = {
    channels,
    remind_minutes_before: str(fd, 'remind_minutes_before') ?? '30',
    daily_digest_hour: str(fd, 'daily_digest_hour') ?? '8',
  }
  for (const [key, value] of Object.entries(values)) {
    await sql`insert into settings (key, value) values (${key}, ${value})
              on conflict (key) do update set value = excluded.value`
  }
  refresh()
}
