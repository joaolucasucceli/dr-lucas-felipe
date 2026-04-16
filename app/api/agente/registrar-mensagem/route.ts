import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    conversaId?: string
    leadId?: string
    conteudo?: string
    direcao?: string
    tipo?: string
    messageIdWhatsapp?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { leadId, conteudo, direcao, tipo, messageIdWhatsapp } = body
  let { conversaId } = body

  if (!leadId || !conteudo || !direcao) {
    return NextResponse.json(
      { error: "leadId, conteudo e direcao são obrigatórios" },
      { status: 400 }
    )
  }

  if (!conversaId) {
    const novoId = criarId()
    const { error: convError } = await supabaseAdmin
      .from("conversas")
      .insert({
        id: novoId,
        atualizadoEm: agora(),
        leadId,
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
      leadId,
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
