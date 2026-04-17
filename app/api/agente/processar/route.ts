import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validarApiSecret } from "@/lib/api-auth"
import { processarMensagens } from "@/lib/agente/loop"
import { agendarProcessamento, deveProcessar } from "@/lib/agente/buffer"
import { supabaseAdmin } from "@/lib/supabase"
import { enviarDigitando } from "@/lib/uazapi"

// Precisa aguentar o debounce de 20s + processamento do LLM.
// Vercel serverless padrao (Hobby) = 10s; este endpoint declara 60s explicitamente.
export const maxDuration = 60

const DEBOUNCE_MS = 20_000
// WhatsApp expira o presence "composing" em ~15s — renova a meio-caminho do debounce.
const REFRESH_DIGITANDO_MS = 10_000

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { chatId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { chatId } = body
  if (!chatId) {
    return NextResponse.json({ error: "chatId é obrigatório" }, { status: 400 })
  }

  // Se ja ha um debounce em andamento, outra instancia vai processar. Retorna rapido.
  const podeProcessar = await deveProcessar(chatId)
  if (!podeProcessar) {
    return NextResponse.json({ status: "debounce" })
  }

  // Adquire o lock (TTL 20s). Webhooks posteriores veem isso e nao disparam.
  await agendarProcessamento(chatId)

  // JLAU-551: renova "digitando" a meio-caminho do debounce pra nao expirar.
  // O webhook ja disparou composing em t=0; aqui renovamos em t=10s.
  const { data: configPresence } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  await new Promise((resolve) => setTimeout(resolve, REFRESH_DIGITANDO_MS))

  if (configPresence?.uazapiUrl && configPresence?.instanceToken) {
    try {
      await enviarDigitando(
        configPresence.uazapiUrl,
        configPresence.instanceToken,
        chatId,
        true
      )
    } catch (err) {
      console.warn(
        "[Processar] Falha ao renovar digitando:",
        err instanceof Error ? err.message : err
      )
    }
  }

  await new Promise((resolve) =>
    setTimeout(resolve, DEBOUNCE_MS - REFRESH_DIGITANDO_MS)
  )

  // Processa todas as mensagens acumuladas no buffer.
  try {
    await processarMensagens(chatId)
  } catch (err) {
    console.error("[Agente] Erro ao processar mensagens:", err)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }

  return NextResponse.json({ status: "processado" })
}
