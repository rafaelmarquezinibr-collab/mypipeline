import { runReminders } from '@/lib/reminders'

// Chamado pelo agendador (pg_cron do Supabase ou Vercel Cron) com o header
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Não autorizado', { status: 401 })
  }
  return Response.json(await runReminders())
}
