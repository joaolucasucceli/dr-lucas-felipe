import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarProcedimentoSchema } from "@/lib/validations/procedimento"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_PROCEDIMENTO =
  "id, nome, tipo, descricao, duracaoMin, posOperatorio, ativo, criadoEm"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const ativo = searchParams.get("ativo")
  const busca = searchParams.get("busca")

  let query = supabaseAdmin
    .from("procedimentos")
    .select(SELECT_PROCEDIMENTO)
    .is("deletadoEm", null)

  if (ativo !== null && ativo !== undefined && ativo !== "") {
    query = query.eq("ativo", ativo === "true")
  }
  if (busca) {
    query = query.ilike("nome", `%${busca}%`)
  }

  const { data, error } = await query.order("nome", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarProcedimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: procedimento, error } = await supabaseAdmin
    .from("procedimentos")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      ...parsed.data,
    })
    .select(SELECT_PROCEDIMENTO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(procedimento, { status: 201 })
}
