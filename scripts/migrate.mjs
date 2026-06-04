import pg from 'pg'
import { readFileSync } from 'fs'

const sql = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8')

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected. Running schema...')
  await client.query(sql)
  console.log('✅ Schema applied successfully')
  const { rows } = await client.query("select table_name from information_schema.tables where table_schema='public' order by table_name")
  console.log('Tables:', rows.map(r => r.table_name).join(', '))
} catch (e) {
  console.error('❌ Error:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
