import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarBaseConhecimentoSchema } from "@/lib/validations/base-conhecimento"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_BASE =
  "id, titulo, conteudo, secao, ordem, ativo, criadoEm, atualizadoEm"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const ativo = searchParams.get("ativo")
  const secao = searchParams.get("secao")
  const busca = searchParams.get("busca")

  let query = supabaseAdmin
    .from("base_conhecimento")
    .select(SELECT_BASE)
    .is("deletadoEm", null)

  if (ativo !== null && ativo !== undefined && ativo !== "") {
    query = query.eq("ativo", ativo === "true")
  }
  if (secao) {
    query = query.eq("secao", secao)
  }
  if (busca) {
    query = query.or(`titulo.ilike.%${busca}%,conteudo.ilike.%${busca}%`)
  }

  const { data, error } = await query
    .order("secao", { ascending: true })
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarBaseConhecimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: registro, error } = await supabaseAdmin
    .from("base_conhecimento")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      ...parsed.data,
    })
    .select(SELECT_BASE)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(registro, { status: 201 })
}
