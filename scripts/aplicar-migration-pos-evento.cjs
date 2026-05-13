/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: ".env.local" })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL nao definida em .env.local")
  process.exit(1)
}

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260513200000_pos_evento_agendamento.sql"
)
const sqlRaw = fs.readFileSync(migrationPath, "utf8")

// Remove comentarios de linha (--) preservando estrutura.
const sqlSemComments = sqlRaw
  .split("\n")
  .map((linha) => {
    const idx = linha.indexOf("--")
    return idx === -1 ? linha : linha.substring(0, idx)
  })
  .join("\n")

// Quebra em statements por ';', filtra vazios.
const stmts = sqlSemComments
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

;(async () => {
  const client = new Client({ connectionString: url })
  await client.connect()
  console.log(`Conectado. ${stmts.length} statement(s) a aplicar.`)
  for (const stmt of stmts) {
    const preview = stmt.substring(0, 100).replace(/\s+/g, " ")
    try {
      await client.query(stmt)
      console.log("OK:", preview)
    } catch (e) {
      console.log("FAIL:", preview, "->", e.message)
    }
  }
  await client.end()
  console.log("Pronto.")
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
