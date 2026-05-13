/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  // Apaga qualquer residuo de teste E2E (contatos com whatsapp comecando com "5511E2E")
  const r1 = await c.query(`DELETE FROM agendamentos WHERE "contatoId" IN (SELECT id FROM contatos WHERE whatsapp LIKE '5511E2E%') RETURNING id`)
  console.log(`Agendamentos apagados: ${r1.rowCount}`)
  const r2 = await c.query(`DELETE FROM conversas WHERE "contatoId" IN (SELECT id FROM contatos WHERE whatsapp LIKE '5511E2E%') RETURNING id`)
  console.log(`Conversas apagadas: ${r2.rowCount}`)
  const r3 = await c.query(`DELETE FROM contatos WHERE whatsapp LIKE '5511E2E%' RETURNING id`)
  console.log(`Contatos apagados: ${r3.rowCount}`)
  await c.end()
})().catch((e) => { console.error(e); process.exit(1) })
