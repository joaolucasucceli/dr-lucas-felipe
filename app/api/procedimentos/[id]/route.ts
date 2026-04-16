import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarProcedimentoSchema } from "@/lib/validations/procedimento"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_PROCEDIMENTO =
  "id, nome, tipo, descricao, valorBase, duracaoMin, posOperatorio, ativo, criadoEm, atualizadoEm"

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: procedimento } = await supabaseAdmin
    .from("procedimentos")
    .select(SELECT_PROCEDIMENTO)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!procedimento) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  return NextResponse.json(procedimento)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarProcedimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: procedimentoAtual } = await supabaseAdmin
    .from("procedimentos")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!procedimentoAtual) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  const { data: procedimentoAtualizado, error } = await supabaseAdmin
    .from("procedimentos")
    .update({ ...parsed.data, atualizadoEm: agora() })
    .eq("id", id)
    .select(SELECT_PROCEDIMENTO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(procedimentoAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: procedimento } = await supabaseAdmin
    .from("procedimentos")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!procedimento) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("procedimentos")
    .update({
      deletadoEm: agora(),
      ativo: false,
      atualizadoEm: agora(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Procedimento removido" })
}
