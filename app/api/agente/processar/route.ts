import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validarApiSecret } from "@/lib/api-auth"
import { deveProcessar } from "@/lib/agente/buffer"
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

  // Verificar se debounce expirou
  const pronto = await deveProcessar(chatId)
  if (!pronto) {
    return NextResponse.json({ status: "aguardando_debounce" })
  }

  // Processar mensagens (fire-and-forget em background)
  processarMensagens(chatId).catch((err) => {
    console.error("[Agente] Erro ao processar mensagens:", err)
  })

  return NextResponse.json({ status: "processando" })
}
