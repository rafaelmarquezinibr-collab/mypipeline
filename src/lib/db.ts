import 'server-only'
import postgres from 'postgres'

const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

// prepare: false é necessário no pooler do Supabase (modo transação)
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 5,
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } },
  })

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql
