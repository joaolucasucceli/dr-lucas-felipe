import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validarApiSecret } from "@/lib/api-auth"
import { processarMensagens } from "@/lib/agente/loop"
import { agendarProcessamento, deveProcessar } from "@/lib/agente/buffer"

// Precisa aguentar o debounce de 20s + processamento do LLM.
// Vercel serverless padrao (Hobby) = 10s; este endpoint declara 60s explicitamente.
export const maxDuration = 60

const DEBOUNCE_MS = 20_000

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

  // Aguarda 20s pra acumular mensagens do usuario (simula comportamento humano).
  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS))

  // Processa todas as mensagens acumuladas no buffer.
  try {
    await processarMensagens(chatId)
  } catch (err) {
    console.error("[Agente] Erro ao processar mensagens:", err)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }

  return NextResponse.json({ status: "processado" })
}
