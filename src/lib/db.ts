import 'server-only'
import postgres from 'postgres'

const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

// prepare: false é necessário no pooler do Supabase.
// Use o Session pooler (porta 5432): o Transaction pooler (6543) trava com consultas
// simultâneas na mesma conexão, que o postgres.js faz quando o pool está cheio.
// max cobre o maior Promise.all das páginas, para cada consulta ter sua conexão.
// Timeouts curtos: em função serverless, conexão presa vira página carregando sem fim.
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 8,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } },
  })

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql
