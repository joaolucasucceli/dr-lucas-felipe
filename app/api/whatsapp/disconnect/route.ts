import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { desconectar } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"

export async function POST(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_whatsapp")
    .select("id, uazapiUrl, instanceToken, adminToken")
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  const instanceToken = config?.instanceToken || config?.adminToken

  if (!config || !instanceToken) {
    return NextResponse.json(
      { error: "Nenhuma instância ativa" },
      { status: 404 }
    )
  }

  try {
    await desconectar(config.uazapiUrl, instanceToken).catch(() => {})
  } catch {
    // Ignorar erros do Uazapi — limpar config local mesmo assim
  }

  await supabaseAdmin
    .from("config_whatsapp")
    .update({
      instanceId: null,
      instanceToken: null,
      numeroWhatsapp: null,
      webhookUrl: null,
      ativo: false,
      atualizadoEm: agora(),
    })
    .eq("id", config.id)

  return NextResponse.json({ sucesso: true })
}
