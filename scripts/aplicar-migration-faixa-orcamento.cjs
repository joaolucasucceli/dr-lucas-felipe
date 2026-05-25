/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: ".env.local" })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL nao definida")
  process.exit(1)
}

const sqlRaw = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20260525120000_procedimentos_valor_base_faixa.sql"),
  "utf8"
)

const sqlSemComments = sqlRaw
  .split("\n")
  .map((linha) => {
    const idx = linha.indexOf("--")
    return idx === -1 ? linha : linha.substring(0, idx)
  })
  .join("\n")

const stmts = sqlSemComments
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

;(async () => {
  const client = new Client({ connectionString: url })
  await client.connect()
  console.log(`Aplicando ${stmts.length} statement(s) da migration JLU-167...`)
  for (const stmt of stmts) {
    const preview = stmt.substring(0, 120).replace(/\s+/g, " ")
    try {
      await client.query(stmt)
      console.log("OK:", preview)
    } catch (e) {
      console.log("FAIL:", preview, "->", e.message)
    }
  }
  await client.end()
  console.log("Migration aplicada.")
})().catch((e) => { console.error(e); process.exit(1) })
