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
    .from("base_conhecimento")
    .select("titulo, conteudo")
    .is("deletadoEm", null)

  if (body.filtro) {
    query = query.or(`titulo.ilike.%${body.filtro}%,conteudo.ilike.%${body.filtro}%`)
  }

  const { data: artigos, error } = await query.order("titulo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    artigos: artigos ?? [],
    total: artigos?.length ?? 0,
  })
}
