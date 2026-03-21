import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { verificarStatus } from "@/lib/uazapi"

function mascarar(valor: string): string {
  if (valor.length <= 4) return "••••••••"
  return "••••••••" + valor.slice(-4)
}

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  if (!config) {
    return NextResponse.json({
      configurado: false,
      ativo: false,
      status: "unconfigured",
    })
  }

  const instanceToken = config.instanceToken || config.adminToken

  // Se não tem token de instância, retornar configurado mas não conectado
  if (!instanceToken) {
    return NextResponse.json({
      configurado: true,
      ativo: false,
      status: "no_instance",
      config: {
        uazapiUrl: config.uazapiUrl,
        adminToken: mascarar(config.adminToken),
      },
    })
  }

  try {
    const resultado = await verificarStatus(
      config.uazapiUrl,
      instanceToken
    )

    // Se conectado, atualizar numero e ativo
    if (resultado.status === "connected" && resultado.jid) {
      const numero = resultado.jid.split("@")[0]

      if (!config.ativo || config.numeroWhatsapp !== numero) {
        await prisma.configWhatsapp.update({
          where: { id: config.id },
          data: { ativo: true, numeroWhatsapp: numero },
        })
      }

      return NextResponse.json({
        configurado: true,
        ativo: true,
        status: "connected",
        numeroWhatsapp: numero,
        config: {
          uazapiUrl: config.uazapiUrl,
          adminToken: mascarar(config.adminToken),
          instanceId: config.instanceId,
        },
      })
    }

    return NextResponse.json({
      configurado: true,
      ativo: false,
      status: resultado.status,
      config: {
        uazapiUrl: config.uazapiUrl,
        adminToken: mascarar(config.adminToken),
        instanceId: config.instanceId,
      },
    })
  } catch {
    return NextResponse.json({
      configurado: true,
      ativo: config.ativo,
      status: "error",
      numeroWhatsapp: config.numeroWhatsapp,
      config: {
        uazapiUrl: config.uazapiUrl,
        adminToken: mascarar(config.adminToken),
        instanceId: config.instanceId,
      },
    })
  }
}
