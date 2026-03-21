import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { desconectar, deletarInstancia } from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const config = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  if (!config || !config.instanceToken) {
    return NextResponse.json(
      { error: "Nenhuma instância ativa" },
      { status: 404 }
    )
  }

  try {
    // Desconectar e deletar instância no Uazapi
    await desconectar(config.uazapiUrl, config.instanceToken).catch(() => {})

    if (config.instanceId) {
      await deletarInstancia(
        config.uazapiUrl,
        config.instanceId,
        config.adminToken
      ).catch(() => {})
    }
  } catch {
    // Ignorar erros do Uazapi — limpar config local mesmo assim
  }

  // Limpar dados de instância
  await prisma.configWhatsapp.update({
    where: { id: config.id },
    data: {
      instanceId: null,
      instanceToken: null,
      numeroWhatsapp: null,
      webhookUrl: null,
      ativo: false,
    },
  })

  return NextResponse.json({ sucesso: true })
}
