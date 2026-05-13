/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E do fluxo de handoff humano de orcamento (tarefa 1913496a).
 *
 * Cenarios:
 *  A) endpoint /api/agente/solicitar-orcamento-humano cria evento, marca
 *     contato como aguardando, retorna 200 com orcamentoPendenteId
 *  B) chamar 2x = idempotente (jaPendente:true, mesmo id)
 *  C) com contato aguardando, mensagem do paciente NAO aciona IA
 *  D) mensagem do Dr. Lucas (fromMe=true) ZERA o aguardando e marca o
 *     evento como respondido. Proxima msg do paciente reativa a IA.
 */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const API_SECRET = process.env.API_SECRET
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
  let resultados = []

  function check(nome, cond) {
    resultados.push({ nome, ok: cond })
    console.log(`    ${cond ? "🟢" : "🔴"} ${nome}`)
  }

  try {
    console.log("\n[setup] Criando contato + conversa...")
    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'qualificacao', NOW(), NOW())`,
      [contatoId, `Maria Handoff ${ts}`, whatsapp]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'qualificacao', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])
    console.log(`    contatoId=${contatoId}`)

    // ===== Cenario A — endpoint cria evento + marca contato =====
    console.log("\n[A] POST /api/agente/solicitar-orcamento-humano...")
    const r1 = await fetch(`${BASE_URL}/api/agente/solicitar-orcamento-humano`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": API_SECRET },
      body: JSON.stringify({
        contatoId,
        conversaId,
        resumoCaso: "Abdômen + flancos + braços, 3 fotos enviadas. Pediu valor pra combo fora do Paciente Modelo.",
        prioridade: "normal",
      }),
    })
    const d1 = await r1.json()
    console.log("    HTTP:", r1.status, d1)

    check("A.1 endpoint 200", r1.status === 200)
    check("A.2 retornou orcamentoPendenteId", !!d1.orcamentoPendenteId)
    check("A.3 aguardando=true", d1.aguardando === true)

    const r2 = await client.query(
      `SELECT "aguardandoOrcamentoHumano", "aguardandoOrcamentoDesde" FROM contatos WHERE id = $1`,
      [contatoId]
    )
    check("A.4 contato.aguardandoOrcamentoHumano=true", r2.rows[0]?.aguardandoOrcamentoHumano === true)
    check("A.5 aguardandoOrcamentoDesde setado", r2.rows[0]?.aguardandoOrcamentoDesde != null)

    const r3 = await client.query(
      `SELECT id, "resumoCaso", prioridade, "respondidoEm" FROM eventos_orcamento_pendente WHERE "contatoId" = $1`,
      [contatoId]
    )
    check("A.6 evento criado", r3.rows.length === 1)
    check("A.7 resumoCaso preservado", r3.rows[0]?.resumoCaso.includes("Abdômen"))
    check("A.8 respondidoEm null (aberto)", r3.rows[0]?.respondidoEm == null)

    // ===== Cenario B — idempotencia =====
    console.log("\n[B] POST 2× = idempotente?")
    const r4 = await fetch(`${BASE_URL}/api/agente/solicitar-orcamento-humano`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": API_SECRET },
      body: JSON.stringify({
        contatoId,
        conversaId,
        resumoCaso: "tentativa duplicada (deve retornar jaPendente)",
      }),
    })
    const d4 = await r4.json()
    console.log("    HTTP:", r4.status, d4)
    check("B.1 jaPendente=true", d4.jaPendente === true)
    check("B.2 mesmo orcamentoPendenteId", d4.orcamentoPendenteId === d1.orcamentoPendenteId)

    const r5 = await client.query(`SELECT count(*)::int as n FROM eventos_orcamento_pendente WHERE "contatoId" = $1`, [contatoId])
    check("B.3 ainda 1 evento (sem duplicar)", r5.rows[0]?.n === 1)

    // ===== Cenario C — paciente manda msg, IA não responde (paused) =====
    console.log("\n[C] Webhook entrante do PACIENTE — IA deve ficar muda...")
    const payloadPaciente = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_HANDOFF_PAC_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Oi! E aí, conseguiu falar com ele?",
        mediaType: "",
      },
      chat: { name: `Maria Handoff ${ts}` },
    }
    await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payloadPaciente),
    })

    console.log("    Aguardando 35s (debounce + processar)...")
    await new Promise((r) => setTimeout(r, 35000))

    const r6 = await client.query(
      `SELECT remetente, conteudo FROM mensagens_whatsapp WHERE "contatoId" = $1 AND remetente='agente'`,
      [contatoId]
    )
    check("C.1 IA NAO mandou mensagem (pausada)", r6.rows.length === 0)

    // ===== Cenario D — Dr. Lucas responde (fromMe=true) → zera aguardando =====
    console.log("\n[D] Webhook fromMe=true (Dr. Lucas respondendo) — deve fechar handoff...")
    const payloadDoutor = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_HANDOFF_DOC_${ts}`,
        chatid: chatId,
        fromMe: true,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Oi Maria, tudo bem? Pro seu caso fica R$ 18.500 (lipo abdome + flancos + braços + enxerto). Posso te mandar mais detalhes?",
        mediaType: "",
      },
      chat: { name: `Maria Handoff ${ts}` },
    }
    await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payloadDoutor),
    })

    // fromMe nao dispara processar — efeito eh sincrono dentro do POST. Espera bem curtinha.
    await new Promise((r) => setTimeout(r, 3000))

    const r7 = await client.query(
      `SELECT "aguardandoOrcamentoHumano" FROM contatos WHERE id = $1`,
      [contatoId]
    )
    check("D.1 aguardandoOrcamentoHumano voltou pra false", r7.rows[0]?.aguardandoOrcamentoHumano === false)

    const r8 = await client.query(
      `SELECT "respondidoEm" FROM eventos_orcamento_pendente WHERE "contatoId" = $1`,
      [contatoId]
    )
    check("D.2 eventos.respondidoEm setado", r8.rows[0]?.respondidoEm != null)

    // ===== Resumo =====
    console.log("\n[fim]")
    const passou = resultados.filter((r) => r.ok).length
    const total = resultados.length
    console.log(`Resultado: ${passou}/${total} checks ${passou === total ? "🟢" : "🔴"}`)
    process.exitCode = passou === total ? 0 : 1
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
