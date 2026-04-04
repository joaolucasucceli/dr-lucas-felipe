import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { enviarMensagem } from "@/lib/uazapi"
import { z } from "zod"
import { randomUUID } from "crypto"

const schema = z.object({
  conversaId: z.string().min(1),
  texto: z.string().min(1),
  replyToId: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parse.error.flatten() },
      { status: 400 }
    )
  }

  const { conversaId, texto, replyToId } = parse.data

  // Buscar conversa com lead e config WhatsApp
  const conversa = await prisma.conversa.findUnique({
    where: { id: conversaId },
    include: { lead: true },
  })

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  const config = await prisma.configWhatsapp.findFirst({ where: { ativo: true } })
  if (!config?.instanceToken || !config?.uazapiUrl) {
    return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 })
  }

  // Buscar messageIdWhatsapp do reply se fornecido
  let replyMessageId: string | undefined
  if (replyToId) {
    const replyMsg = await prisma.mensagemWhatsapp.findUnique({
      where: { id: replyToId },
      select: { messageIdWhatsapp: true },
    })
    if (replyMsg) replyMessageId = replyMsg.messageIdWhatsapp
  }

  // Enviar via Uazapi
  const numero = conversa.lead.whatsapp
  const chatId = `${numero}@s.whatsapp.net`
  await enviarMensagem(config.uazapiUrl, config.instanceToken, chatId, texto, replyMessageId)

  // Salvar no banco
  const mensagem = await prisma.mensagemWhatsapp.create({
    data: {
      conversaId,
      leadId: conversa.leadId,
      messageIdWhatsapp: `atendente_${randomUUID()}`,
      tipo: "texto",
      conteudo: texto,
      remetente: "atendente",
      replyToId: replyToId || null,
    },
  })

  // Atualizar ultimaMensagemEm da conversa
  await prisma.conversa.update({
    where: { id: conversaId },
    data: { ultimaMensagemEm: new Date() },
  })

  return NextResponse.json(mensagem, { status: 201 })
}
