/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E do fluxo pos-evento (sem disparar WhatsApp pra evitar ban):
 *  1. cria contato + conversa + agendamento fake com dataHora 2h atras
 *  2. dispara cron via HTTP (vai pegar esse agendamento)
 *  3. simula resposta do paciente direto via tool confirmar_presenca
 *  4. valida agendamento.status='realizado' + conversa.iaResponde=false
 *
 * Importante: o cron tenta enviar mensagem real via Uazapi. Pra evitar isso,
 * usamos um numero whatsapp obviamente fake ("55_TESTE_E2E_<ts>") que NAO
 * vai bater em ninguem real — Uazapi vai falhar o envio, mas o cron ja
 * marca posEventoEnviado ANTES de chamar uazapi, entao a marcacao persiste.
 *
 * Limpeza: apaga contato + conversa + agendamento no fim.
 */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const API_SECRET = process.env.API_SECRET
const BASE_URL = "https://dr-lucas-central.vercel.app"

if (!DATABASE_URL || !API_SECRET) {
  console.error("Faltam env vars: DATABASE_URL ou API_SECRET")
  process.exit(1)
}

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
    console.log("\n[1/6] Criando contato + conversa + agendamento fake...")

    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'consulta_agendada', NOW(), NOW())`,
      [contatoId, `Maria E2E ${ts}`, whatsapp]
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

    console.log(`    contatoId=${contatoId}`)
    console.log(`    conversaId=${conversaId}`)
    console.log(`    agendamentoId=${agendamentoId}`)
    console.log(`    dataHora=${dataHoraPassado} (2h atras)`)

    console.log("\n[2/6] Disparando cron /api/cron/pos-evento...")
    const r1 = await fetch(`${BASE_URL}/api/cron/pos-evento`, {
      method: "GET",
      headers: { "x-api-secret": API_SECRET },
    })
    const data1 = await r1.json()
    console.log("    Status HTTP:", r1.status)
    console.log("    Resposta:", JSON.stringify(data1))

    console.log("\n[3/6] Validando posEventoEnviado no banco...")
    const r2 = await client.query(
      `SELECT id, status, "posEventoEnviado" FROM agendamentos WHERE id = $1`,
      [agendamentoId]
    )
    console.log("    Resultado:", r2.rows[0])
    const posEventoMarcado = r2.rows[0]?.posEventoEnviado != null
    console.log(`    posEventoEnviado setado? ${posEventoMarcado ? "✅ SIM" : "❌ NAO"}`)

    console.log("\n[4/6] Chamando POST /api/agente/confirmar-presenca (simula resposta SIM)...")
    const r3 = await fetch(`${BASE_URL}/api/agente/confirmar-presenca`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": API_SECRET,
      },
      body: JSON.stringify({ agendamentoId }),
    })
    const data3 = await r3.json()
    console.log("    Status HTTP:", r3.status)
    console.log("    Resposta:", JSON.stringify(data3))

    console.log("\n[5/6] Validando agendamento.status='realizado' + conversa.iaResponde=false...")
    const r4 = await client.query(
      `SELECT a.status AS agstatus, c."iaResponde", c."encerradaEm"
       FROM agendamentos a JOIN conversas c ON c."contatoId" = a."contatoId"
       WHERE a.id = $1`,
      [agendamentoId]
    )
    console.log("    Resultado:", r4.rows[0])
    const okStatus = r4.rows[0]?.agstatus === "realizado"
    const okIa = r4.rows[0]?.iaResponde === false
    const okEnc = r4.rows[0]?.encerradaEm != null
    console.log(`    status='realizado'? ${okStatus ? "✅" : "❌"}`)
    console.log(`    iaResponde=false? ${okIa ? "✅" : "❌"}`)
    console.log(`    encerradaEm setado? ${okEnc ? "✅" : "❌"}`)

    console.log("\n[6/6] Resumo:")
    const tudoOk = posEventoMarcado && okStatus && okIa && okEnc
    console.log(tudoOk ? "🟢 PASSOU — fluxo pos-evento + encerramento OK" : "🔴 FALHOU — checar acima")
    process.exitCode = tudoOk ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    if (process.env.SEM_LIMPEZA === "1") {
      console.log("\n[SEM LIMPEZA — SEM_LIMPEZA=1] dados de teste preservados pra debug:")
      for (const [tabela, ident] of limpos) {
        console.log(`    ${tabela}/${ident}`)
      }
    } else {
      console.log("\n[limpeza] removendo dados de teste...")
      for (const [tabela, ident] of limpos.reverse()) {
        try {
          await client.query(`DELETE FROM ${tabela} WHERE id = $1`, [ident])
          console.log(`    apagado: ${tabela}/${ident}`)
        } catch (e) {
          console.log(`    falha apagando ${tabela}/${ident}: ${e.message}`)
        }
      }
    }
    await client.end()
  }
})()
