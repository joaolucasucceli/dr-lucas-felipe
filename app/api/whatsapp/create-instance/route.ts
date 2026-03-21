import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configurarWebhook, obterQrCode } from "@/lib/uazapi"

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

  const instanceToken = config.instanceToken || config.adminToken

  try {
    // Configurar webhook (não-fatal se falhar — pode ser configurado no painel)
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

    // Iniciar conexão e obter QR code (POST /instance/connect)
    const { qrcode } = await obterQrCode(config.uazapiUrl, instanceToken)

    return NextResponse.json({ sucesso: true, qrcode })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao conectar instância" },
      { status: 500 }
    )
  }
}
