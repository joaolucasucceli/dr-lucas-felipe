import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId, agora } from "@/lib/db-utils"

const schema = z.object({
  conversaId: z.string().min(1).optional(),
  contatoId: z.string().min(1),
  conteudo: z.string().min(1),
  direcao: z.enum(["agente", "paciente"]),
  tipo: z.string().min(1).optional(),
  messageIdWhatsapp: z.string().min(1).optional(),
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

  const { contatoId, conteudo, direcao, tipo, messageIdWhatsapp } = parsed.data
  let { conversaId } = parsed.data

  if (!conversaId) {
    const novoId = criarId()
    const { error: convError } = await supabaseAdmin
      .from("conversas")
      .insert({
        id: novoId,
        atualizadoEm: agora(),
        contatoId,
      })

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }
    conversaId = novoId
  }

  const { data: mensagem, error } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .insert({
      id: criarId(),
      conversaId,
      contatoId,
      messageIdWhatsapp: messageIdWhatsapp || `agente_${criarId()}`,
      tipo: (tipo || "texto") as never,
      conteudo,
      remetente: direcao === "agente" ? "agente" : "paciente",
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
    .eq("id", conversaId)

  return NextResponse.json({ mensagem, conversaId })
}
