import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { mudarStatusSchema } from "@/lib/validations/lead"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = mudarStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, statusFunil, responsavelId")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const perfil = auth.session.user.perfil
  if (
    perfil === "atendente" &&
    lead.responsavelId !== auth.session.user.id
  ) {
    return NextResponse.json(
      { error: "Sem permissão para mover este lead" },
      { status: 403 }
    )
  }

  const novoStatus = parsed.data.statusFunil

  const { data: leadAtualizado, error } = await supabaseAdmin
    .from("leads")
    .update({
      statusFunil: novoStatus,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", id)
    .select("id, nome, statusFunil")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(leadAtualizado)
}
