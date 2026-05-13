/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E #6: GPT-4o real chama `solicitar_orcamento_humano` quando o
 * paciente pede preço de procedimento fora do Paciente Modelo padrão.
 *
 * Cenário: paciente já mandou foto + região (lipo de braço, fora do catálogo
 * Paciente Modelo padrão), pergunta "quanto fica?". Regra 1b do prompt deve
 * fazer GPT chamar a tool. Validamos:
 *  1. contato.aguardandoOrcamentoHumano = true após processar
 *  2. evento em eventos_orcamento_pendente criado
 *  3. mensagem da IA pro paciente tem o tom da regra ("deixa eu alinhar...")
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

  function check(nome, cond, detalhes) {
    console.log(`    ${cond ? "🟢" : "🔴"} ${nome}${detalhes ? " — " + detalhes : ""}`)
    return cond
  }

  try {
    console.log("\n[setup] Criando paciente que JÁ mandou foto + região (braços)...")
    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "procedimentoInteresse", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'qualificacao', $4, NOW(), NOW())`,
      [contatoId, `Maria Braços ${ts}`, whatsapp, "lipo de braço"]
    )
    limpos.push(["contatos", contatoId])

    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'qualificacao', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )
    limpos.push(["conversas", conversaId])

    // Mensagem auto-contida MUITO explícita pra forçar regra 1b: combo fora do
    // Paciente Modelo + foto-mencionada + região identificada + valor explícito.
    console.log(`    contatoId=${contatoId} (mensagem auto-contida explícita)`)

    console.log("\n[1/3] Simulando paciente: combo fora do padrão + pede valor explícito...")
    const payload = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_HANDOFF_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content:
          "Oi! Já te mandei as fotos do meu abdome + flancos + braços. Quero fazer lipo nas 3 regiões juntas (sem o programa paciente modelo). Já vi outras clínicas cobrando R$ 25.000 nesse combo completo. Me passa o valor EXATO do Dr. Lucas pra eu decidir hoje?",
        mediaType: "",
      },
      chat: { name: `Maria Combo ${ts}` },
    }
    const r = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    })
    console.log("    HTTP:", r.status, await r.text())

    console.log("\n[2/3] Aguardando 80s (20s debounce + ~40s GPT-4o com tool calls)...")
    await new Promise((r) => setTimeout(r, 80000))

    console.log("\n[3/3] Validando...")

    // (a) contato.aguardandoOrcamentoHumano
    const r2 = await client.query(
      `SELECT "aguardandoOrcamentoHumano", "aguardandoOrcamentoDesde" FROM contatos WHERE id = $1`,
      [contatoId]
    )
    const okFlag = check(
      "contato.aguardandoOrcamentoHumano = true",
      r2.rows[0]?.aguardandoOrcamentoHumano === true,
      `valor: ${r2.rows[0]?.aguardandoOrcamentoHumano}`
    )

    // (b) evento criado
    const r3 = await client.query(
      `SELECT id, "resumoCaso", prioridade FROM eventos_orcamento_pendente WHERE "contatoId" = $1`,
      [contatoId]
    )
    const okEvento = check(
      "evento_orcamento_pendente criado",
      r3.rows.length === 1,
      r3.rows[0] ? `resumo: "${r3.rows[0].resumoCaso}"` : "nenhum evento"
    )

    // (c) última mensagem do agente tem o tom esperado
    const r4 = await client.query(
      `SELECT conteudo FROM mensagens_whatsapp WHERE "contatoId" = $1 AND remetente = 'agente' ORDER BY "criadoEm" DESC LIMIT 1`,
      [contatoId]
    )
    const ultimaIa = r4.rows[0]?.conteudo ?? ""
    const okMsg = check(
      "última msg da IA respeita prompt (não cita valor inventado)",
      // Não pode ter valor monetário inventado. Tem que mencionar Dr. Lucas vai retornar.
      !/r\$\s*\d/i.test(ultimaIa) && /(lucas|alinhar|aguard|retorno|paciência|um pouco|me d|posso)/i.test(ultimaIa),
      `"${ultimaIa.substring(0, 200)}..."`
    )

    // Sempre printa TODAS as mensagens da conversa pra debug
    const rAll = await client.query(
      `SELECT remetente, conteudo, "criadoEm" FROM mensagens_whatsapp
       WHERE "contatoId" = $1 ORDER BY "criadoEm" ASC`,
      [contatoId]
    )
    console.log("\n[debug] Todas as mensagens dessa conversa:")
    for (const m of rAll.rows) {
      console.log(`    [${m.remetente}] "${m.conteudo.substring(0, 250)}"`)
    }

    console.log("\n[fim]")
    const tudoOk = okFlag && okEvento && okMsg
    console.log(tudoOk ? "\n🟢 PASSOU — GPT chamou solicitar_orcamento_humano corretamente" : "\n🔴 FALHOU")
    process.exitCode = tudoOk ? 0 : 1
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
