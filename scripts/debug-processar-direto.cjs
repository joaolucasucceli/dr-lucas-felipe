/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
const crypto = require("crypto")
require("dotenv").config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const API_SECRET = process.env.API_SECRET
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

  try {
    // 1. Cria contato com responsavelId apontando pra usuário IA existente
    const { rows: iaUser } = await client.query(
      `SELECT id FROM usuarios WHERE tipo='ia' AND ativo=true AND "deletadoEm" IS NULL LIMIT 1`
    )
    const usuarioIaId = iaUser[0]?.id
    console.log("usuarioIaId:", usuarioIaId)

    await client.query(
      `INSERT INTO contatos (id, nome, whatsapp, "statusFunil", "responsavelId", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, $3, 'qualificacao', $4, NOW(), NOW())`,
      [contatoId, `Maria Debug ${ts}`, whatsapp, usuarioIaId]
    )
    await client.query(
      `INSERT INTO conversas (id, "contatoId", etapa, "ultimaMensagemEm", "atualizadoEm", "criadoEm")
       VALUES ($1, $2, 'qualificacao', NOW(), NOW(), NOW())`,
      [conversaId, contatoId]
    )

    console.log("contatoId:", contatoId, "chatId:", chatId)

    // 2. Dispara webhook
    console.log("\n→ Webhook entrante...")
    const payload = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_DBG_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Quero saber sobre lipoaspiração",
        mediaType: "",
      },
      chat: { name: `Maria Debug ${ts}` },
    }
    const r = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    })
    console.log("HTTP:", r.status, await r.text())

    // 3. Espera 80s
    console.log("\n→ Aguardando 80s...")
    await new Promise((r) => setTimeout(r, 80000))

    // 4. Conta mensagens
    const { rows: msgs } = await client.query(
      `SELECT remetente, conteudo FROM mensagens_whatsapp WHERE "contatoId"=$1 ORDER BY "criadoEm" ASC`,
      [contatoId]
    )
    console.log("\n→ Mensagens (total %d):", msgs.length)
    for (const m of msgs) console.log(`   [${m.remetente}] "${m.conteudo.substring(0,200)}"`)

    if (msgs.filter((m) => m.remetente === "agente").length === 0) {
      console.log("\n⚠️  IA não respondeu. Vou tentar chamar /api/agente/processar diretamente...")
      const r2 = await fetch(`${BASE_URL}/api/agente/processar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-secret": API_SECRET },
        body: JSON.stringify({ chatId }),
      })
      console.log("processar HTTP:", r2.status, await r2.text())

      console.log("\n→ Aguardando mais 40s...")
      await new Promise((r) => setTimeout(r, 40000))

      const { rows: msgs2 } = await client.query(
        `SELECT remetente, conteudo FROM mensagens_whatsapp WHERE "contatoId"=$1 ORDER BY "criadoEm" ASC`,
        [contatoId]
      )
      console.log("\n→ Mensagens depois do processar direto (total %d):", msgs2.length)
      for (const m of msgs2) console.log(`   [${m.remetente}] "${m.conteudo.substring(0,200)}"`)
    }
  } finally {
    console.log("\n[limpeza]")
    await client.query(`DELETE FROM mensagens_whatsapp WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM analista_logs WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM eventos_orcamento_pendente WHERE "contatoId" = $1`, [contatoId])
    await client.query(`DELETE FROM conversas WHERE id = $1`, [conversaId])
    await client.query(`DELETE FROM contatos WHERE id = $1`, [contatoId])
    await client.end()
  }
})()
