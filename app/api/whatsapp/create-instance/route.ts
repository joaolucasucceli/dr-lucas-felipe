import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarInstancia, configurarWebhook, obterQrCode } from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  if (!config) {
    return NextResponse.json(
      { error: "Configure as credenciais primeiro" },
      { status: 400 }
    )
  }

  let instanceToken = config.instanceToken

  // Se não tem instance token, criar instância via admin API
  if (!instanceToken) {
    const resultado = await criarInstancia(
      config.uazapiUrl,
      config.adminToken,
      "dr-lucas"
    )

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.erro || "Erro ao criar instância" },
        { status: 500 }
      )
    }

    instanceToken = resultado.instanceToken || ""

    // Salvar instance token no banco
    await prisma.configWhatsapp.update({
      where: { id: config.id },
      data: { instanceToken },
    })
  }

  try {
    // Configurar webhook
    const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`
    let webhookConfigurado = false

    try {
      const webhookToken = process.env.WEBHOOK_SECRET || process.env.API_SECRET || ""
      await configurarWebhook(config.uazapiUrl, instanceToken, webhookUrl, webhookToken)
      await prisma.configWhatsapp.update({
        where: { id: config.id },
        data: { webhookUrl },
      })
      webhookConfigurado = true
    } catch (webhookErr) {
      console.error("[create-instance] Falha ao configurar webhook:", webhookErr instanceof Error ? webhookErr.message : webhookErr)
    }

    // Iniciar conexão e obter QR code
    const { qrcode } = await obterQrCode(config.uazapiUrl, instanceToken)

    return NextResponse.json({ sucesso: true, qrcode, webhookConfigurado })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao conectar instância" },
      { status: 500 }
    )
  }
}
