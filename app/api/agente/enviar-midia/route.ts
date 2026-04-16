import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"
import { enviarMidia } from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  const body = await request.json()
  const { leadId, conversaId, categoria, procedimento } = body

  if (!leadId || !conversaId || !categoria) {
    return NextResponse.json(
      { error: "leadId, conversaId e categoria obrigatórios" },
      { status: 400 }
    )
  }

  const where: Record<string, unknown> = {
    categoria,
    ativo: true,
    deletadoEm: null,
  }
  if (procedimento) where.procedimento = procedimento

  const midias = await prisma.midiaMarketing.findMany({ where })
  if (midias.length === 0) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Nenhuma mídia disponível nessa categoria",
    })
  }

  const midia = midias[Math.floor(Math.random() * midias.length)]

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const configWa = await prisma.configWhatsapp.findFirst({
    where: { ativo: true },
  })
  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "WhatsApp não configurado",
    })
  }

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  )
  const urlCompleta = midia.url.startsWith("http")
    ? midia.url
    : `${baseUrl}${midia.url.startsWith("/") ? "" : "/"}${midia.url}`

  const tipoUazapi = midia.tipo === "video" ? "video" : "image"

  await enviarMidia(
    configWa.uazapiUrl,
    configWa.instanceToken,
    lead.whatsapp,
    urlCompleta,
    tipoUazapi as "image" | "video",
    midia.titulo
  )

  await prisma.mensagemWhatsapp.create({
    data: {
      conversaId,
      leadId,
      messageIdWhatsapp: `agente_midia_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      tipo: midia.tipo === "video" ? "video" : "imagem",
      conteudo: midia.titulo,
      remetente: "agente",
      mediaUrl: urlCompleta,
      mediaType: midia.tipo,
    },
  })

  await prisma.conversa.update({
    where: { id: conversaId },
    data: { ultimaMensagemEm: new Date() },
  })

  return NextResponse.json({
    ok: true,
    enviado: true,
    titulo: midia.titulo,
    tipo: midia.tipo,
  })
}
