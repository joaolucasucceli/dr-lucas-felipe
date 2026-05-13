import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let query = supabaseAdmin
    .from("procedimentos")
    .select(
      "id, nome, tipo, descricao, duracaoMin, posOperatorio, " +
        "valorEstimadoBrl, valorCheioBrl, parcelamento, escopoOferta",
    )
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (body.filtro) {
    query = query.ilike("nome", `%${body.filtro}%`)
  }

  const { data: procedimentos, error } = await query.order("nome", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ procedimentos: procedimentos ?? [] })
}
