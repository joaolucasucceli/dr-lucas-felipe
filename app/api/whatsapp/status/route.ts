import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { verificarStatus } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"

function mascarar(valor: string): string {
  if (valor.length <= 4) return "••••••••"
  return "••••••••" + valor.slice(-4)
}

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_whatsapp")
    .select(
      "id, uazapiUrl, adminToken, instanceToken, instanceId, numeroWhatsapp, ativo"
    )
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json({
      configurado: false,
      ativo: false,
      status: "unconfigured",
    })
  }

  const instanceToken = config.instanceToken || config.adminToken

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

    if (resultado.status === "connected" && resultado.jid) {
      const numero = resultado.jid.split("@")[0]

      if (!config.ativo || config.numeroWhatsapp !== numero) {
        await supabaseAdmin
          .from("config_whatsapp")
          .update({ ativo: true, numeroWhatsapp: numero, atualizadoEm: agora() })
          .eq("id", config.id)
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
