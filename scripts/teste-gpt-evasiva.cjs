/* eslint-disable @typescript-eslint/no-require-imports */
/** Teste E2E #4: resposta evasiva NÃO aciona tool — agendamento segue agendado. */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const BASE_URL = "https://dr-lucas-central.vercel.app"
const id = () => crypto.randomBytes(12).toString("hex")

;(async () => {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  const ts = Date.now()
  const contatoId = id()
  const conversaId = id()
  const agendamentoId = id()
  const whatsapp = `5511E2E${ts}`
  const chatId = `${whatsapp}@s.whatsapp.net`
  const dataHoraPassado = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const posEventoEnviado = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const limpos = []

  try {
    console.log("\n[1/4] Setup...")
    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'consulta_agendada', NOW(), NOW())`,
      [contatoId, `Maria Evasiva ${ts}`, whatsapp]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'consulta_agendada', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])

    await client.query(
      `INSERT INTO agendamentos (id, "contatoId", "dataHora", duracao, status, "criadoPor", tipo, "posEventoEnviado", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 60, 'agendado', 'ia', 'consulta_online', $4, NOW(), NOW())`,
      [agendamentoId, contatoId, dataHoraPassado, posEventoEnviado]
    )
    limpos.push(["agendamentos", agendamentoId])

    await client.query(
      `INSERT INTO mensagens_whatsapp (id, "conversaId", "contatoId", "messageIdWhatsapp", tipo, conteudo, remetente, "criadoEm")
       VALUES ($1, $2, $3, $4, 'texto', $5, 'agente', NOW())`,
      [id(), conversaId, contatoId, `IA_POS_EVENTO_${ts}`, "Oi! Tudo bem? Conseguiu fazer a avaliação com o Dr. Lucas hoje?"]
    )

    console.log("\n[2/4] Simulando 'Tô ocupada agora, depois te falo'...")
    const payload = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_E2E_EVA_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Tô ocupada agora, depois te falo!",
        mediaType: "",
      },
      chat: { name: `Maria Evasiva ${ts}` },
    }
    const r = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    })
    console.log("    HTTP:", r.status, await r.text())

    console.log("\n[3/4] Aguardando 45s...")
    await new Promise((r) => setTimeout(r, 45000))

    console.log("\n[4/4] Validando...")
    const r2 = await client.query(
      `SELECT a.status AS agstatus, c."iaResponde", c."encerradaEm"
       FROM agendamentos a JOIN conversas c ON c."contatoId" = a."contatoId"
       WHERE a.id = $1`,
      [agendamentoId]
    )
    console.log("    DB:", r2.rows[0])

    // Esperado: NADA muda. Status segue 'agendado', conversa segue aberta.
    const okStatus = r2.rows[0]?.agstatus === "agendado"
    const okIa = r2.rows[0]?.iaResponde === true
    const okEnc = r2.rows[0]?.encerradaEm == null

    console.log(`    status='agendado' (intocado)? ${okStatus ? "🟢" : "🔴"}`)
    console.log(`    iaResponde=true (conversa segue)? ${okIa ? "🟢" : "🔴"}`)
    console.log(`    encerradaEm null? ${okEnc ? "🟢" : "🔴"}`)

    const tudoOk = okStatus && okIa && okEnc
    console.log(`\n    ${tudoOk ? "🟢 PASSOU — GPT respeitou evasiva e NÃO chamou tool" : "🔴 FALHOU"}`)
    process.exitCode = tudoOk ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    console.log("\n[limpeza]")
    await client.query(`DELETE FROM mensagens_whatsapp WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM analista_logs WHERE "contatoId" = $1`, [contatoId])
    for (const [tabela, ident] of limpos.reverse()) {
      try { await client.query(`DELETE FROM ${tabela} WHERE id = $1`, [ident]); console.log(`    apagado: ${tabela}/${ident}`) }
      catch (e) { console.log(`    falha: ${tabela}/${ident}: ${e.message}`) }
    }
    await client.end()
  }
})()
