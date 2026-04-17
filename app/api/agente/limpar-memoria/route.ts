import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { limparMemoria } from "@/lib/agente/memoria"
import { limparBuffer, limparDebounce } from "@/lib/agente/buffer"

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const whatsapp: string | undefined = body.whatsapp
  const chatIdInput: string | undefined = body.chatId

  if (!whatsapp && !chatIdInput) {
    return NextResponse.json(
      { error: "Informe whatsapp ou chatId" },
      { status: 400 }
    )
  }

  // Aceita "5511999998888", "+55 (11) 99999-8888" ou chatId completo.
  const chatId = chatIdInput
    ? chatIdInput
    : `${(whatsapp || "").replace(/\D/g, "")}@s.whatsapp.net`

  await Promise.all([
    limparMemoria(chatId),
    limparBuffer(chatId),
    limparDebounce(chatId),
  ])

  return NextResponse.json({ ok: true, chatId })
}
