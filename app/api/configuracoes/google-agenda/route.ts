import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { configGoogleSchema } from "@/lib/validations/config-google"
import { criarId, agora } from "@/lib/db-utils"

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("id, clientId, clientSecret, refreshToken, ativo, atualizadoEm")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json({ configurado: false, config: null })
  }

  return NextResponse.json({
    configurado: true,
    config: {
      id: config.id,
      clientId: config.clientId,
      clientSecret: "••••••••" + config.clientSecret.slice(-4),
      conectado: !!config.refreshToken,
      ativo: config.ativo,
      atualizadoEm: config.atualizadoEm,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = configGoogleSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: existente } = await supabaseAdmin
    .from("config_google_calendar")
    .select("id")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) {
    const { error } = await supabaseAdmin
      .from("config_google_calendar")
      .update({ ...parsed.data, atualizadoEm: agora() })
      .eq("id", existente.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabaseAdmin
      .from("config_google_calendar")
      .insert({ id: criarId(), atualizadoEm: agora(), ...parsed.data })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ sucesso: true, configurado: true })
}

export async function DELETE(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("id")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json({ error: "Nenhuma configuração ativa" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("config_google_calendar")
    .update({ ativo: false, atualizadoEm: agora() })
    .eq("id", config.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true, configurado: false })
}
