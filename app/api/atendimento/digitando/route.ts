import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { enviarDigitando } from "@/lib/uazapi"
import { z } from "zod"

const schema = z.object({
  conversaId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const conversa = await prisma.conversa.findUnique({
    where: { id: parse.data.conversaId },
    include: { lead: { select: { whatsapp: true } } },
  })

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  const config = await prisma.configWhatsapp.findFirst({ where: { ativo: true } })
  if (!config?.instanceToken || !config?.uazapiUrl) {
    return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 })
  }

  const chatId = `${conversa.lead.whatsapp}@s.whatsapp.net`

  try {
    await enviarDigitando(config.uazapiUrl, config.instanceToken, chatId, true)
  } catch {
    // Não bloquear se falhar
  }

  return NextResponse.json({ sucesso: true })
}
