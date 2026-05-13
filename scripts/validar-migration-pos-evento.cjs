/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL não definida em .env.local")
  process.exit(1)
}

;(async () => {
  const client = new Client({ connectionString: url })
  await client.connect()

  const checks = [
    {
      nome: "enum StatusAgendamento",
      sql: 'SELECT unnest(enum_range(NULL::"StatusAgendamento"))::text AS valor',
    },
    {
      nome: "agendamentos.posEventoEnviado",
      sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='posEventoEnviado'",
    },
    {
      nome: "conversas.iaResponde",
      sql: "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='conversas' AND column_name='iaResponde'",
    },
    {
      nome: "indice pos-evento",
      sql: "SELECT indexname FROM pg_indexes WHERE indexname='idx_agendamentos_pos_evento_pendente'",
    },
  ]

  for (const c of checks) {
    const r = await client.query(c.sql)
    console.log(`-- ${c.nome}`)
    console.log(r.rows)
  }
  await client.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
