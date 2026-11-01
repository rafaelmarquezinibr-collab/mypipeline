import { sql } from '@/lib/db'

/**
 * Diz quais variáveis de ambiente existem e se o banco responde, sem expor valores.
 * Público de propósito, para diagnosticar o deploy antes de conseguir logar.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k]?.trim())
  let db: string
  const t0 = Date.now()
  try {
    const [{ n, deals, leads }] = await sql<{ n: number; deals: number; leads: number }[]>`
      select (select count(*)::int from stages) as n, (select count(*)::int from deals) as deals,
             (select count(*)::int from leads) as leads`
    db = `ok em ${Date.now() - t0} ms (${n} etapas, ${deals} negócios, ${leads} leads)`
  } catch (e) {
    db = `erro: ${(e as { code?: string }).code ?? 'sem conexão'}`
  }
  return Response.json({
    APP_PASSWORD: has('APP_PASSWORD'),
    SESSION_SECRET: has('SESSION_SECRET'),
    DATABASE_URL: has('DATABASE_URL'),
    banco: db,
    APP_URL: process.env.APP_URL ?? null,
    CRON_SECRET: has('CRON_SECRET'),
    CALENDAR_TOKEN: has('CALENDAR_TOKEN'),
    VAPID: has('NEXT_PUBLIC_VAPID_PUBLIC_KEY') && has('VAPID_PRIVATE_KEY'),
    RESEND: has('RESEND_API_KEY') && has('REMINDER_EMAIL_TO'),
    CALLMEBOT: has('CALLMEBOT_PHONE') && has('CALLMEBOT_APIKEY'),
  })
}
