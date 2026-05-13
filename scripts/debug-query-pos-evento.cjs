/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })

const url = process.env.DATABASE_URL

;(async () => {
  const client = new Client({ connectionString: url })
  await client.connect()

  // Mesmo filtro do cron pos-evento. Janela ampla pra ver TUDO.
  const agoraTs = new Date()
  const limiteSuperior = new Date(agoraTs.getTime() - 1 * 60 * 60 * 1000)
  const limiteInferior = new Date(agoraTs.getTime() - 12 * 60 * 60 * 1000)

  console.log("Agora:", agoraTs.toISOString())
  console.log("Limite inferior (12h atras):", limiteInferior.toISOString())
  console.log("Limite superior (1h atras):", limiteSuperior.toISOString())

  // Query 1: tudo em agendamentos
  const r = await client.query(
    `SELECT id, "contatoId", "dataHora", status, "criadoPor", "posEventoEnviado"
     FROM agendamentos
     WHERE status IN ('agendado', 'confirmado', 'remarcado')
       AND "criadoPor" = 'ia'
       AND "posEventoEnviado" IS NULL
       AND "dataHora" > $1
       AND "dataHora" < $2
     ORDER BY "dataHora" DESC
     LIMIT 5`,
    [limiteInferior.toISOString(), limiteSuperior.toISOString()]
  )
  console.log("\nAgendamentos elegiveis (mesmo filtro do cron):")
  console.log(r.rows)

  await client.end()
})().catch((e) => { console.error(e); process.exit(1) })
