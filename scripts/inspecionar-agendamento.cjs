/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })

const idArg = process.argv[2]
if (!idArg) {
  console.error("Uso: node scripts/inspecionar-agendamento.cjs <agendamentoId>")
  process.exit(1)
}

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  const r = await c.query(
    `SELECT id, "contatoId", "dataHora", status, "criadoPor", "posEventoEnviado", duracao, tipo, "criadoEm"
     FROM agendamentos
     WHERE id = $1`,
    [idArg]
  )
  console.log("Agendamento:")
  console.log(r.rows)

  // Re-aplica filtro do cron explicito
  const ha1h = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  const ha12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  console.log("\nAgora:", new Date().toISOString())
  console.log("ha1h:", ha1h)
  console.log("ha12h:", ha12h)

  if (r.rows[0]) {
    const a = r.rows[0]
    const dh = new Date(a.dataHora)
    console.log("\nChecagens do filtro do cron:")
    console.log(`  status IN ('agendado','confirmado','remarcado'):`, ["agendado", "confirmado", "remarcado"].includes(a.status))
    console.log(`  criadoPor = 'ia':`, a.criadoPor === "ia")
    console.log(`  posEventoEnviado IS NULL:`, a.posEventoEnviado === null)
    console.log(`  dataHora ($1 < dataHora):`, dh.toISOString(), "vs ha12h:", ha12h, "→", dh.toISOString() > ha12h)
    console.log(`  dataHora (< $2):`, dh.toISOString(), "vs ha1h:", ha1h, "→", dh.toISOString() < ha1h)
  }

  await c.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
