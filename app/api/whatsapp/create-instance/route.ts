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
    // Configurar webhook (não-fatal se falhar)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`

    try {
      await configurarWebhook(config.uazapiUrl, instanceToken, webhookUrl)
      await prisma.configWhatsapp.update({
        where: { id: config.id },
        data: { webhookUrl },
      })
    } catch {
      console.warn("[create-instance] Webhook não configurado via API — configure manualmente no painel Uazapi")
    }

    // Iniciar conexão e obter QR code
    const { qrcode } = await obterQrCode(config.uazapiUrl, instanceToken)

    return NextResponse.json({ sucesso: true, qrcode })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao conectar instância" },
      { status: 500 }
    )
  }
}
