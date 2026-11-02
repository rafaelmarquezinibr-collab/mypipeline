import 'server-only'
import postgres from 'postgres'

const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

// prepare: false é necessário no pooler do Supabase.
// Use o Session pooler (porta 5432): o Transaction pooler (6543) trava com consultas
// simultâneas na mesma conexão, que o postgres.js faz quando o pool está cheio.
// No Session pooler cada conexão aberta ocupa uma vaga do pool do Supabase (15 no plano grátis),
// somando todas as instâncias da Vercel (produção, previews, cron). Por isso poucas conexões
// por instância e devolução rápida das ociosas; as consultas de um Promise.all se enfileiram.
// Timeouts curtos: em função serverless, conexão presa vira página carregando sem fim.
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 3,
    idle_timeout: 5,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } },
  })

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql
