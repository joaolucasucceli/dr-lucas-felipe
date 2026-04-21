/**
 * Diagnostico do webhook Uazapi — verifica config atual + reconfigura
 *
 * Uso:
 *   npx tsx scripts/diagnostico-webhook.ts          # so lista (GET)
 *   npx tsx scripts/diagnostico-webhook.ts --fix    # reconfigura (POST)
 *
 * Requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env.local / .env.production.local
 * + NEXTAUTH_URL (para montar webhook URL) + API_SECRET/WEBHOOK_SECRET
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

function sanear(v: string): string {
  return v.replace(/^["']|["']$/g, "").replace(/\\n|\\r|\r|\n/g, "").trim()
}

function carregarEnv() {
  for (const nome of [".env.local", ".env.production.local", ".env.production"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), nome), "utf-8")
      for (const linha of raw.split(/\r?\n/)) {
        const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (!m) continue
        const [, k, v] = m
        if (!process.env[k]) process.env[k] = sanear(v)
      }
    } catch {
      // arquivo pode nao existir
    }
  }
}

carregarEnv()

const supabaseUrl = sanear(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "")
const serviceKey = sanear(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
const nextauthUrl = sanear(process.env.NEXTAUTH_URL || "http://localhost:3000")
const webhookToken = sanear(process.env.WEBHOOK_SECRET || process.env.API_SECRET || "")

if (!supabaseUrl || !serviceKey) {
  console.error("Faltando SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const modoFix = process.argv.includes("--fix")

  const { data: config, error } = await supabase
    .from("config_whatsapp")
    .select("id, uazapiUrl, instanceToken, webhookUrl, ativo")
    .eq("ativo", true)
    .maybeSingle()

  if (error || !config) {
    console.error("Nao foi possivel carregar config_whatsapp ativo:", error?.message)
    process.exit(1)
  }

  console.log("[diagnostico-webhook] Config ativa:")
  console.log(`  uazapiUrl:   ${config.uazapiUrl}`)
  console.log(`  webhookUrl:  ${config.webhookUrl}`)
  console.log(`  instanceToken: ${(config.instanceToken || "").slice(0, 8)}...`)
  console.log("")

  const baseUrl = config.uazapiUrl.replace(/\/$/, "")

  // GET /webhook — config atual
  const getRes = await fetch(`${baseUrl}/webhook`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: config.instanceToken,
    },
  })
  const getBody = await getRes.text()
  console.log(`[GET /webhook] HTTP ${getRes.status}`)
  try {
    const parsed = JSON.parse(getBody)
    console.log(JSON.stringify(parsed, null, 2))
  } catch {
    console.log(getBody || "(vazio)")
  }
  console.log("")

  if (!modoFix) {
    console.log("Para reconfigurar, rode:  npx tsx scripts/diagnostico-webhook.ts --fix")
    return
  }

  // POST /webhook — reconfigura
  const webhookUrl = `${nextauthUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`
  const postBody = {
    url: webhookUrl,
    enabled: true,
    events: ["messages", "messages_update", "connection"],
    excludeMessages: ["wasSentByApi", "isGroupYes"],
    token: webhookToken,
  }

  console.log(`[POST /webhook] Enviando config:`)
  console.log(JSON.stringify(postBody, null, 2))
  console.log("")

  const postRes = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: config.instanceToken,
    },
    body: JSON.stringify(postBody),
  })
  const postBodyRes = await postRes.text()
  console.log(`[POST /webhook] HTTP ${postRes.status}`)
  console.log(postBodyRes || "(vazio)")
  console.log("")

  // Confirmar GET depois
  const confRes = await fetch(`${baseUrl}/webhook`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: config.instanceToken,
    },
  })
  const confBody = await confRes.text()
  console.log(`[GET /webhook apos fix] HTTP ${confRes.status}`)
  try {
    console.log(JSON.stringify(JSON.parse(confBody), null, 2))
  } catch {
    console.log(confBody || "(vazio)")
  }

  // Atualiza webhookUrl na tabela
  await supabase
    .from("config_whatsapp")
    .update({ webhookUrl, atualizadoEm: new Date().toISOString() })
    .eq("id", config.id)

  console.log("\n[diagnostico-webhook] Concluido. config_whatsapp.webhookUrl atualizada.")
}

main().catch((err) => {
  console.error("ERRO:", err)
  process.exit(1)
})
