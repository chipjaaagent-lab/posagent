import pg from 'pg'
import { readFileSync } from 'fs'

// Load .env (simple parser, local only)
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch {}

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
  const before = await client.query(
    "select id, shop_id, name, gp_percent from channels where name = 'LINE MAN' and gp_percent = 30"
  )
  console.log(`Found ${before.rows.length} LINE MAN channel(s) at 30%`)
  const res = await client.query(
    "update channels set gp_percent = 32.1 where name = 'LINE MAN' and gp_percent = 30"
  )
  console.log(`✅ Updated ${res.rowCount} channel(s) to 32.1%`)
} catch (e) {
  console.error('❌ Error:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
