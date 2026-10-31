// Aplica as migrações SQL de db/migrations em ordem. Uso: npm run db:migrate
import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL')
const sql = postgres(url, { max: 1 })

await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`
const done = new Set((await sql`select name from _migrations`).map((r) => r.name))
const dir = new URL('../db/migrations/', import.meta.url)
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) continue
  const body = await readFile(new URL(file, dir), 'utf8')
  await sql.begin(async (tx) => {
    await tx.unsafe(body)
    await tx`insert into _migrations (name) values (${file})`
  })
  console.log('aplicada', file)
}
await sql.end()
