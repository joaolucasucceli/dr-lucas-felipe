import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarProcedimentoRegiaoSchema } from "@/lib/validations/procedimento-regiao"
import { agora } from "@/lib/db-utils"
import { SELECT_REGIAO } from "../route"

type RouteParams = { params: Promise<{ id: string }> }

async function buscarFaixaViva(id: string) {
  const { data } = await supabaseAdmin
    .from("procedimento_regioes")
    .select('id, "valorMinBrl", "valorMaxBrl"')
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()
  return data
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarProcedimentoRegiaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const atual = await buscarFaixaViva(id)
  if (!atual) {
    return NextResponse.json({ error: "Faixa não encontrada" }, { status: 404 })
  }

  // PATCH parcial: se so um dos dois valores veio, a ordem tem que ser
  // conferida contra o valor que ja esta gravado — senao um PATCH de
  // { valorMaxBrl: 5000 } sobre um minimo de 8000 passaria pelo schema e
  // estouraria no CHECK do banco como 500.
  const min = parsed.data.valorMinBrl ?? Number(atual.valorMinBrl)
  const max = parsed.data.valorMaxBrl ?? Number(atual.valorMaxBrl)
  if (max < min) {
    return NextResponse.json(
      { error: "Valor máximo não pode ser menor que o mínimo" },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("procedimento_regioes")
    .update({ ...parsed.data, atualizadoEm: agora() })
    .eq("id", id)
    .select(SELECT_REGIAO)
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Essa região já tem faixa cadastrada neste procedimento" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const atual = await buscarFaixaViva(id)
  if (!atual) {
    return NextResponse.json({ error: "Faixa não encontrada" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("procedimento_regioes")
    .update({ deletadoEm: agora(), ativo: false, atualizadoEm: agora() })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Faixa removida" })
}
