import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarInstancia, listarInstancias, configurarWebhook, obterQrCode } from "@/lib/uazapi"

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

  // Se não tem instance token ou é igual ao admin token, criar instância via admin API
  if (!instanceToken || instanceToken === config.adminToken) {
    // Verificar se já existe instância criada
    const lista = await listarInstancias(config.uazapiUrl, config.adminToken)
    const existente = lista.instancias?.find((i) => i.Token)

    if (existente) {
      instanceToken = existente.Token
    } else {
      // Criar nova instância
      const novoToken = randomBytes(32).toString("hex")
      const resultado = await criarInstancia(
        config.uazapiUrl,
        config.adminToken,
        "dr-lucas",
        novoToken
      )

      if (!resultado.ok) {
        return NextResponse.json(
          { error: resultado.erro || "Erro ao criar instância" },
          { status: 500 }
        )
      }

      instanceToken = novoToken
    }

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
