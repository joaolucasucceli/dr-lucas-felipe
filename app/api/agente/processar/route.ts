import { NextResponse, after } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { validarApiSecret } from "@/lib/api-auth"
import { processarMensagens } from "@/lib/agente/loop"
import { analisarConversa } from "@/lib/agente/analista"
import { agendarProcessamento, deveProcessar } from "@/lib/agente/buffer"
import { supabaseAdmin } from "@/lib/supabase"
import { enviarDigitando } from "@/lib/uazapi"

// Precisa aguentar o debounce de 20s + processamento do LLM.
// Vercel serverless padrao (Hobby) = 10s; este endpoint declara 60s explicitamente.
export const maxDuration = 60

const DEBOUNCE_MS = 20_000
// WhatsApp expira o presence "composing" em ~15s — renova a meio-caminho do debounce.
const REFRESH_DIGITANDO_MS = 10_000

const schema = z.object({
  chatId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { chatId } = parsed.data

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
  let resultado: Awaited<ReturnType<typeof processarMensagens>> = null
  try {
    resultado = await processarMensagens(chatId)
  } catch (err) {
    console.error("[Agente] Erro ao processar mensagens:", err)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }

  // Analista IA roda DEPOIS da response (background). Antes estava com await
  // dentro do loop, atrasando 2-5s a resposta HTTP pro UAZAPI por nada
  // (UAZAPI nao precisa do resultado da Analista pra confirmar entrega).
  if (resultado?.contatoId) {
    after(async () => {
      try {
        await analisarConversa(resultado!)
      } catch (err) {
        console.error("[Analista] Falha em background:", err)
      }
    })
  }

  return NextResponse.json({ status: "processado" })
}
