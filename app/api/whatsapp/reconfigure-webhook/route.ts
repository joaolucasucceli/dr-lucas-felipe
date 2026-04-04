import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configurarWebhook } from "@/lib/uazapi"
import { z } from "zod"

const schema = z.object({
  configId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "configId obrigatório" }, { status: 400 })
  }

  const config = await prisma.configWhatsapp.findUnique({
    where: { id: parse.data.configId },
  })

  if (!config) {
    return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 })
  }

  const instanceToken = config.instanceToken || config.adminToken
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`

  try {
    await configurarWebhook(config.uazapiUrl, instanceToken, webhookUrl)
    await prisma.configWhatsapp.update({
      where: { id: config.id },
      data: { webhookUrl },
    })

    return NextResponse.json({ sucesso: true, webhookUrl })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao reconfigurar webhook" },
      { status: 500 }
    )
  }
}
