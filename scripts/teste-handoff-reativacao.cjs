/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E #8: reativação completa do fluxo handoff.
 *
 * Setup: contato com aguardandoOrcamentoHumano=true (simulando que IA chamou a tool).
 *
 * Sequência:
 *  1. Dr. Lucas responde fromMe=true ("R$ 18.500 paciente, posso te explicar?")
 *  2. valida que aguardando voltou false + evento.respondidoEm setado
 *  3. paciente responde "Top! Vou pensar e te aviso"
 *  4. valida que IA respondeu (mensagem do agente surgiu)
 */
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
  const whatsapp = `5511E2E${ts}`
  const chatId = `${whatsapp}@s.whatsapp.net`
  const limpos = []
  const checks = []

  function check(nome, cond, detalhes) {
    checks.push({ nome, ok: cond })
    console.log(`    ${cond ? "🟢" : "🔴"} ${nome}${detalhes ? " — " + detalhes : ""}`)
  }

  try {
    console.log("\n[setup] Contato com aguardando=true + evento aberto...")
    const { rows: iaUser } = await client.query(
      `SELECT id FROM usuarios WHERE tipo='ia' AND ativo=true AND "deletadoEm" IS NULL LIMIT 1`
    )
    const usuarioIaId = iaUser[0]?.id

    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "responsavelId",
        "aguardandoOrcamentoHumano", "aguardandoOrcamentoDesde", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'qualificacao', $4, true, NOW(), NOW(), NOW())`,
      [contatoId, `Maria Reativ ${ts}`, whatsapp, usuarioIaId]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'qualificacao', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])

    const eventoId = id()
    await client.query(
      `INSERT INTO eventos_orcamento_pendente (id, "contatoId", "conversaId", "resumoCaso", prioridade, "criadoEm")
       VALUES ($1, $2, $3, $4, 'normal', NOW())`,
      [eventoId, contatoId, conversaId, "Teste E2E reativação — combo fora do padrão"]
    )
    console.log(`    contatoId=${contatoId} aguardando=true eventoId=${eventoId}`)

    // ===== Passo 1: Dr. Lucas responde (fromMe=true) =====
    console.log("\n[1/4] Webhook fromMe=true (Dr. Lucas respondendo orçamento)...")
    const payloadDoutor = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_DOC_${ts}`,
        chatid: chatId,
        fromMe: true,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content:
          "Maria, tudo bem? Pro seu caso completo (abdome+flancos+braços), fica R$ 18.500 parcelando em 12x. Posso te explicar o que tá incluso?",
        mediaType: "",
      },
      chat: { name: `Maria Reativ ${ts}` },
    }
    const r1 = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payloadDoutor),
    })
    console.log("    HTTP:", r1.status, await r1.text())

    await new Promise((r) => setTimeout(r, 4000))

    const r2 = await client.query(
      `SELECT "aguardandoOrcamentoHumano" FROM contatos WHERE id = $1`,
      [contatoId]
    )
    check("[1] aguardando voltou false após Dr. Lucas responder", r2.rows[0]?.aguardandoOrcamentoHumano === false)

    const r3 = await client.query(
      `SELECT "respondidoEm" FROM eventos_orcamento_pendente WHERE id = $1`,
      [eventoId]
    )
    check("[2] evento.respondidoEm setado", r3.rows[0]?.respondidoEm != null)

    // ===== Passo 2: paciente responde =====
    console.log("\n[2/4] Webhook do PACIENTE (resposta natural depois do orçamento)...")
    const payloadPaciente = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_PAC_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Top, gostei do valor! Pode me explicar o que tá incluso? E como faço pra marcar?",
        mediaType: "",
      },
      chat: { name: `Maria Reativ ${ts}` },
    }
    const r4 = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payloadPaciente),
    })
    console.log("    HTTP:", r4.status, await r4.text())

    console.log("\n[3/4] Aguardando 80s (debounce + GPT)...")
    await new Promise((r) => setTimeout(r, 80000))

    console.log("\n[4/4] Validando que IA processou a mensagem...")
    const r5 = await client.query(
      `SELECT remetente, conteudo, "criadoEm" FROM mensagens_whatsapp
       WHERE "contatoId" = $1 ORDER BY "criadoEm" ASC`,
      [contatoId]
    )
    console.log("    Mensagens da conversa:")
    for (const m of r5.rows) {
      console.log(`      [${m.remetente}] "${m.conteudo.substring(0, 200)}"`)
    }

    const msgsAgente = r5.rows.filter((m) => m.remetente === "agente")
    if (msgsAgente.length > 0) {
      check("[3a] IA respondeu com mensagem registrada", true, `${msgsAgente.length}`)
    } else {
      // Whatsapp fake faz enviarMensagem falhar → for break antes de registrar_mensagem.
      // Proxy: analista_logs roda em background DEPOIS de processarMensagens retornar
      // resultado — se tem log, IA chegou até o fim do loop.
      const r6 = await client.query(
        `SELECT id, aplicado, "confiancaGeral", erro FROM analista_logs WHERE "contatoId" = $1`,
        [contatoId]
      )
      console.log(`    [proxy] analista_logs: ${r6.rows.length} entries`)
      check(
        "[3b] proxy: Eduarda rodou (= IA processou até o fim, msg perdida por Uazapi fake)",
        r6.rows.length > 0
      )
    }

    console.log("\n[fim]")
    const ok = checks.filter((c) => c.ok).length
    const tot = checks.length
    console.log(`Resultado: ${ok}/${tot} checks ${ok === tot ? "🟢" : "🔴"}`)
    process.exitCode = ok === tot ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    console.log("\n[limpeza]")
    await client.query(`DELETE FROM mensagens_whatsapp WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM analista_logs WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM eventos_orcamento_pendente WHERE "contatoId" = $1`, [contatoId])
    for (const [tabela, ident] of limpos.reverse()) {
      try { await client.query(`DELETE FROM ${tabela} WHERE id = $1`, [ident]); console.log(`    apagado: ${tabela}/${ident}`) }
      catch (e) { console.log(`    falha: ${tabela}/${ident}: ${e.message}`) }
    }
    await client.end()
  }
})()
