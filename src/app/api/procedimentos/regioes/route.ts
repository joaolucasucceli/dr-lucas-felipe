import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarProcedimentoRegiaoSchema } from "@/lib/validations/procedimento-regiao"
import { criarId, agora } from "@/lib/db-utils"

export const SELECT_REGIAO =
  'id, "procedimentoId", regiao, "valorMinBrl", "valorMaxBrl", observacao, ativo, "criadoEm"'

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const procedimentoId = request.nextUrl.searchParams.get("procedimentoId")

  let query = supabaseAdmin
    .from("procedimento_regioes")
    .select(SELECT_REGIAO)
    .is("deletadoEm", null)

  if (procedimentoId) {
    query = query.eq("procedimentoId", procedimentoId)
  }

  const { data, error } = await query.order("regiao", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarProcedimentoRegiaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("procedimento_regioes")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      ...parsed.data,
    })
    .select(SELECT_REGIAO)
    .single()

  if (error) {
    // 23505 = unique_violation no indice parcial (procedimentoId, regiao).
    // Mensagem propria porque o texto do Postgres nao ajuda o usuario.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Essa região já tem faixa cadastrada neste procedimento" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
