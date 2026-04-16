import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"
import { criarId, agora } from "@/lib/db-utils"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const categoria = searchParams.get("categoria")
  const tipo = searchParams.get("tipo")
  const busca = searchParams.get("busca")
  const ativo = searchParams.get("ativo")

  let query = supabaseAdmin
    .from("midia_marketing")
    .select("*")
    .is("deletadoEm", null)

  if (categoria) query = query.eq("categoria", categoria)
  if (tipo) query = query.eq("tipo", tipo)
  if (ativo !== null && ativo !== undefined && ativo !== "") {
    query = query.eq("ativo", ativo === "true")
  }
  if (busca) query = query.ilike("titulo", `%${busca}%`)

  const { data, error } = await query
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarMidiaMarketingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: midia, error } = await supabaseAdmin
    .from("midia_marketing")
    .insert({ id: criarId(), atualizadoEm: agora(), ...parsed.data })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(midia, { status: 201 })
}
