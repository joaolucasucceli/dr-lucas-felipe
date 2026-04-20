import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { mudarStatusSchema } from "@/lib/validations/contato"
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

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo, statusFunil, responsavelId")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  if (contato.tipo !== "lead") {
    return NextResponse.json(
      { error: "Apenas contatos tipo lead têm status de funil" },
      { status: 400 }
    )
  }

  const perfil = auth.session.user.perfil
  if (perfil === "atendente" && contato.responsavelId !== auth.session.user.id) {
    return NextResponse.json(
      { error: "Sem permissão para mover este contato" },
      { status: 403 }
    )
  }

  const novoStatus = parsed.data.statusFunil

  const { data: atualizado, error } = await supabaseAdmin
    .from("contatos")
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

  return NextResponse.json(atualizado)
}
