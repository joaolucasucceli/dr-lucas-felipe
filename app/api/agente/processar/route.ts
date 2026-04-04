import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validarApiSecret } from "@/lib/api-auth"
import { processarMensagens } from "@/lib/agente/loop"

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

  // Processar mensagens do buffer (obterELimparBuffer é atômico — previne duplicatas)
  // Precisa ser await — em serverless, fire-and-forget é terminado antes de completar
  try {
    await processarMensagens(chatId)
  } catch (err) {
    console.error("[Agente] Erro ao processar mensagens:", err)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }

  return NextResponse.json({ status: "processado" })
}
