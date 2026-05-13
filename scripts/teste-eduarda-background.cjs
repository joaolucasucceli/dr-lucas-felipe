/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste E2E #5: Eduarda (analista IA de background) roda APÓS o loop.
 *
 * Envia mensagem "Quero saber sobre lipo abdominal" → aguarda processar
 * + Eduarda em background → valida que analista_logs tem entry pro contatoId.
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
  const whatsapp = `5511E2E${ts}`
  const chatId = `${whatsapp}@s.whatsapp.net`
  const limpos = []

  try {
    console.log("\n[1/4] Disparando webhook com paciente NOVO 'quero saber sobre lipo abdominal'...")
    const payload = {
      EventType: "messages",
      token: WEBHOOK_SECRET,
      message: {
        id: `MSG_E2E_EDU_${ts}`,
        chatid: chatId,
        fromMe: false,
        isGroup: false,
        messageTimestamp: Math.floor(Date.now() / 1000),
        content: "Oi, quero saber sobre lipoaspiração abdominal!",
        mediaType: "",
      },
      chat: { name: `Maria Eduarda ${ts}` },
    }
    const r = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-token": WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    })
    console.log("    HTTP:", r.status, await r.text())

    console.log("\n[2/4] Aguardando 70s (20s debounce + ~15s GPT + ~10s Eduarda background)...")
    await new Promise((r) => setTimeout(r, 70000))

    console.log("\n[3/4] Encontrando o contatoId criado...")
    const r1 = await client.query(
      `SELECT id FROM contatos WHERE whatsapp = $1`,
      [whatsapp]
    )
    if (r1.rows.length === 0) {
      throw new Error("Contato nao encontrado — webhook nao processou")
    }
    const contatoId = r1.rows[0].id
    limpos.push(["contatos", contatoId])
    console.log(`    contatoId=${contatoId}`)

    // Conversas + mensagens pra limpar depois
    const rConv = await client.query(`SELECT id FROM conversas WHERE "contatoId" = $1`, [contatoId])
    for (const c of rConv.rows) limpos.push(["conversas", c.id])

    console.log("\n[4/4] Validando entry em analista_logs...")
    const r2 = await client.query(
      `SELECT id, aplicado, "confiancaGeral", erro, "criadoEm"
       FROM analista_logs
       WHERE "contatoId" = $1
       ORDER BY "criadoEm" DESC`,
      [contatoId]
    )
    console.log(`    Entries: ${r2.rows.length}`)
    for (const row of r2.rows) {
      console.log(`      ${row.id} aplicado=${row.aplicado} confianca=${row.confiancaGeral} erro=${row.erro?.substring(0,80) || "—"}`)
    }

    const okEduarda = r2.rows.length > 0
    console.log(`\n    Eduarda rodou? ${okEduarda ? "🟢 SIM" : "🔴 NAO"}`)
    process.exitCode = okEduarda ? 0 : 1
  } catch (e) {
    console.error("\n[ERRO]", e.message)
    process.exitCode = 1
  } finally {
    console.log("\n[limpeza]")
    if (limpos.length > 0) {
      const contatoId = limpos.find((x) => x[0] === "contatos")?.[1]
      if (contatoId) {
        await client.query(`DELETE FROM mensagens_whatsapp WHERE "contatoId" = $1`, [contatoId])
        await client.query(`DELETE FROM analista_logs WHERE "contatoId" = $1`, [contatoId])
        await client.query(`DELETE FROM agendamentos WHERE "contatoId" = $1`, [contatoId])
      }
      for (const [tabela, ident] of limpos.reverse()) {
        try { await client.query(`DELETE FROM ${tabela} WHERE id = $1`, [ident]); console.log(`    apagado: ${tabela}/${ident}`) }
        catch (e) { console.log(`    falha: ${tabela}/${ident}: ${e.message}`) }
      }
    }
    await client.end()
  }
})()
