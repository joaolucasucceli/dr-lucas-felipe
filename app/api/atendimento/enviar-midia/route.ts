import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { enviarMidia } from "@/lib/uazapi"
import { z } from "zod"
import { randomUUID } from "crypto"

const tipoMidiaMap = {
  imagem: "image",
  audio: "ptt",
  documento: "document",
  video: "video",
} as const

const schema = z.object({
  conversaId: z.string().min(1),
  arquivoUrl: z.string().url(),
  tipo: z.enum(["imagem", "audio", "documento", "video"]),
  legenda: z.string().optional(),
  replyToId: z.string().optional(),
  nomeDocumento: z.string().optional(),
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

  const { conversaId, arquivoUrl, tipo, legenda, replyToId, nomeDocumento } = parse.data

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

  const numero = conversa.lead.whatsapp
  const chatId = `${numero}@s.whatsapp.net`
  const tipoUazapi = tipoMidiaMap[tipo]

  await enviarMidia(
    config.uazapiUrl,
    config.instanceToken,
    chatId,
    arquivoUrl,
    tipoUazapi,
    legenda,
    replyMessageId,
    nomeDocumento
  )

  // Salvar no banco
  const conteudo = legenda || `[${tipo}]`
  const mensagem = await prisma.mensagemWhatsapp.create({
    data: {
      conversaId,
      leadId: conversa.leadId,
      messageIdWhatsapp: `atendente_${randomUUID()}`,
      tipo,
      conteudo,
      remetente: "atendente",
      mediaUrl: arquivoUrl,
      mediaType: tipo,
      replyToId: replyToId || null,
    },
  })

  await prisma.conversa.update({
    where: { id: conversaId },
    data: { ultimaMensagemEm: new Date() },
  })

  return NextResponse.json(mensagem, { status: 201 })
}
