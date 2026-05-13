/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E NEGATIVO: paciente respondeu "nao compareceu".
 * Espera: agendamento vira `nao_compareceu`, conversa SEGUE ABERTA
 * (iaResponde=true, encerradaEm=null) pra IA poder oferecer remarcar.
 */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const API_SECRET = process.env.API_SECRET
const BASE_URL = "https://dr-lucas-central.vercel.app"

function id() {
  return crypto.randomBytes(12).toString("hex")
}

;(async () => {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  const ts = Date.now()
  const contatoId = id()
  const conversaId = id()
  const agendamentoId = id()
  const whatsapp = `5511E2E${ts}`
  const dataHoraPassado = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const limpos = []

  try {
    console.log("\n[1/5] Criando agendamento fake...")
    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'consulta_agendada', NOW(), NOW())`,
      [contatoId, `Maria NAO E2E ${ts}`, whatsapp]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'consulta_agendada', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])

    await client.query(
      `INSERT INTO agendamentos (id, "contatoId", "dataHora", duracao, status, "criadoPor", tipo, "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 60, 'agendado', 'ia', 'consulta_online', NOW(), NOW())`,
      [agendamentoId, contatoId, dataHoraPassado]
    )
    limpos.push(["agendamentos", agendamentoId])

    console.log("\n[2/5] Disparando cron...")
    const r1 = await fetch(`${BASE_URL}/api/cron/pos-evento`, {
      method: "GET",
      headers: { "x-api-secret": API_SECRET },
    })
    console.log("    HTTP:", r1.status, await r1.json())

    console.log("\n[3/5] Chamando marcar-nao-compareceu (simula resposta NAO)...")
    const r2 = await fetch(`${BASE_URL}/api/agente/marcar-nao-compareceu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": API_SECRET,
      },
      body: JSON.stringify({ agendamentoId }),
    })
    const data2 = await r2.json()
    console.log("    HTTP:", r2.status, data2)

    console.log("\n[4/5] Validando estado final...")
    const r3 = await client.query(
      `SELECT a.status AS agstatus, c."iaResponde", c."encerradaEm"
       FROM agendamentos a JOIN conversas c ON c."contatoId" = a."contatoId"
       WHERE a.id = $1`,
      [agendamentoId]
    )
    console.log("    Resultado:", r3.rows[0])
    const okStatus = r3.rows[0]?.agstatus === "nao_compareceu"
    const okIa = r3.rows[0]?.iaResponde === true
    const okEnc = r3.rows[0]?.encerradaEm == null

    console.log(`    status='nao_compareceu'? ${okStatus ? "✅" : "❌"}`)
    console.log(`    iaResponde=true (segue respondendo)? ${okIa ? "✅" : "❌"}`)
    console.log(`    encerradaEm null? ${okEnc ? "✅" : "❌"}`)

    console.log("\n[5/5] Resumo:")
    const tudoOk = okStatus && okIa && okEnc
    console.log(tudoOk ? "🟢 PASSOU — fluxo nao_compareceu mantem conversa aberta pra remarcar" : "🔴 FALHOU")
    process.exitCode = tudoOk ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    console.log("\n[limpeza]")
    for (const [tabela, ident] of limpos.reverse()) {
      try {
        await client.query(`DELETE FROM ${tabela} WHERE id = $1`, [ident])
        console.log(`    apagado: ${tabela}/${ident}`)
      } catch (e) {
        console.log(`    falha: ${tabela}/${ident}: ${e.message}`)
      }
    }
    await client.end()
  }
})()
