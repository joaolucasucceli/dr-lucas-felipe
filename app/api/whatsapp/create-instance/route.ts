import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import {
  criarInstancia,
  configurarWebhook,
  obterQrCode,
} from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
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

  try {
    // Criar instância
    const instancia = await criarInstancia(config.uazapiUrl, config.adminToken)

    // Configurar webhook
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`

    await configurarWebhook(
      config.uazapiUrl,
      instancia.token,
      webhookUrl
    )

    // Salvar dados da instância
    await prisma.configWhatsapp.update({
      where: { id: config.id },
      data: {
        instanceId: instancia.id,
        instanceToken: instancia.token,
        webhookUrl,
      },
    })

    // Obter QR code
    const { qrcode } = await obterQrCode(config.uazapiUrl, instancia.token)

    return NextResponse.json({
      sucesso: true,
      instanceId: instancia.id,
      qrcode,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar instância" },
      { status: 500 }
    )
  }
}
