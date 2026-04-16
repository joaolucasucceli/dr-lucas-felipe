import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { configWhatsappSchema } from "@/lib/validations/whatsapp-config"
import { validarAdminToken } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = configWhatsappSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { uazapiUrl, adminToken } = parsed.data

  const resultado = await validarAdminToken(uazapiUrl, adminToken)
  if (!resultado.ok) {
    console.error("[test-connection] Falha ao conectar ao Uazapi:", resultado.erro)
    return NextResponse.json(
      { error: "Não foi possível conectar ao Uazapi.", detalhe: resultado.erro },
      { status: 400 }
    )
  }

  const { data: existente } = await supabaseAdmin
    .from("config_whatsapp")
    .select("id")
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) {
    const { error } = await supabaseAdmin
      .from("config_whatsapp")
      .update({ uazapiUrl, adminToken, atualizadoEm: agora() })
      .eq("id", existente.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabaseAdmin
      .from("config_whatsapp")
      .insert({
        id: criarId(),
        atualizadoEm: agora(),
        uazapiUrl,
        adminToken,
        instanceToken: "",
      })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ sucesso: true })
}
