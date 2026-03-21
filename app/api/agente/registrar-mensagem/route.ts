import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"
import { createId } from "@paralleldrive/cuid2"
import type { TipoMensagem } from "@/generated/prisma/enums"

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

  // Se não há conversaId, criar nova conversa
  if (!conversaId) {
    const conversa = await prisma.conversa.create({
      data: { leadId },
    })
    conversaId = conversa.id
  }

  const mensagem = await prisma.mensagemWhatsapp.create({
    data: {
      conversaId,
      leadId,
      messageIdWhatsapp: messageIdWhatsapp || `agente_${createId()}`,
      tipo: (tipo || "texto") as TipoMensagem,
      conteudo,
      remetente: direcao === "agente" ? "agente" : "paciente",
    },
  })

  // Atualizar ultimaMensagemEm na conversa
  await prisma.conversa.update({
    where: { id: conversaId },
    data: { ultimaMensagemEm: new Date() },
  })

  return NextResponse.json({ mensagem, conversaId })
}
