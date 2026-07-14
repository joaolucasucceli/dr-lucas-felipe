import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { validarApiSecret } from "@/lib/api-auth"
import { processarMensagens } from "@/lib/agente/loop"
import { agendarProcessamento, deveProcessar } from "@/lib/agente/buffer"

// Precisa aguentar o processamento do LLM e eventuais tools.
// O loop interno usa deadline menor para evitar timeout de runtime.
export const maxDuration = 60

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
  console.log("[Processar] Requisicao recebida", { chatId })

  // Se ja ha um debounce em andamento, outra instancia vai processar. Retorna rapido.
  const podeProcessar = await deveProcessar(chatId)
  if (!podeProcessar) {
    console.log("[Processar] Debounce ativo", { chatId })
    return NextResponse.json({ status: "debounce" })
  }

  // Adquire o lock curto. Webhooks posteriores veem isso e nao disparam.
  await agendarProcessamento(chatId)

  // Processa todas as mensagens acumuladas no buffer. A Ana Júlia agora
  // mantém cadastro + funil sozinha via a tool `atualizar_lead` dentro do
  // loop — não há mais pipeline de Analista em background.
  try {
    await processarMensagens(chatId)
  } catch (err) {
    console.error("[Agente] Erro ao processar mensagens:", err)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }

  console.log("[Processar] Processamento concluido", { chatId })
  return NextResponse.json({ status: "processado" })
}
