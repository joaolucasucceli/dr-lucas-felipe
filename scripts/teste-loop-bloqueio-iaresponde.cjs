/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E #1: conversa com iaResponde=false NUNCA dispara IA.
 *
 * Setup:
 *  1. cria contato + conversa COM iaResponde=false
 *  2. simula mensagem entrante "Oi, voltei!" via webhook
 *  3. valida que NENHUMA mensagem da IA foi inserida (loop fez return null)
 */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
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
  const whatsapp = `5511E2E${ts}`
  const chatId = `${whatsapp}@s.whatsapp.net`
  const msgId = `MSG_E2E_BLOQ_${ts}`
  const limpos = []

  try {
    console.log("\n[1/4] Criando contato + conversa COM iaResponde=false...")
    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'consulta_agendada', NOW(), NOW())`,
      [contatoId, `Maria Bloq E2E ${ts}`, whatsapp]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "iaResponde", "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'consulta_agendada', false, NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])

    console.log(`    contatoId=${contatoId} conversaId=${conversaId} (iaResponde=false)`)

    console.log("\n[2/4] Simulando webhook entrante com 'Oi, voltei!'...")
    const payload = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: msgId,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Oi, voltei!",
        mediaType: "",
      },
      chat: { name: `Maria Bloq E2E ${ts}` },
    }

    const r1 = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-token": WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    })
    console.log("    Webhook HTTP:", r1.status, await r1.text())

    console.log("\n[3/4] Aguardando 35s (debounce 20s + processar)...")
    await new Promise((r) => setTimeout(r, 35000))

    console.log("\n[4/4] Validando que NENHUMA mensagem da IA foi enviada...")
    const r2 = await client.query(
      `SELECT id, remetente, conteudo, "criadoEm"
       FROM mensagens_whatsapp
       WHERE "contatoId" = $1
       ORDER BY "criadoEm" DESC`,
      [contatoId]
    )
    console.log("    Mensagens nessa conversa:")
    for (const m of r2.rows) {
      console.log(`      [${m.remetente}] "${m.conteudo}" (${m.criadoEm})`)
    }

    const msgsAgente = r2.rows.filter((m) => m.remetente === "agente")
    const okBloqueio = msgsAgente.length === 0

    console.log(`\n    Mensagens do AGENTE: ${msgsAgente.length} (esperado: 0)`)
    console.log(`    IA bloqueada? ${okBloqueio ? "🟢 SIM" : "🔴 NAO (BUG!)"}`)
    process.exitCode = okBloqueio ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    console.log("\n[limpeza]")
    // mensagens primeiro (FK)
    await client.query(`DELETE FROM mensagens_whatsapp WHERE "contatoId" = $1`, [contatoId])
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
