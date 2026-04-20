import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string; secao?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let query = supabaseAdmin
    .from("base_conhecimento")
    .select("titulo, conteudo, secao")
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (body.secao) {
    query = query.eq("secao", body.secao)
  }

  if (body.filtro) {
    query = query.or(`titulo.ilike.%${body.filtro}%,conteudo.ilike.%${body.filtro}%,secao.ilike.%${body.filtro}%`)
  }

  const { data: artigos, error } = await query
    .order("secao", { ascending: true })
    .order("ordem", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const porSecao = new Map<string, { titulo: string; conteudo: string }[]>()
  for (const artigo of artigos ?? []) {
    const lista = porSecao.get(artigo.secao) ?? []
    lista.push({ titulo: artigo.titulo, conteudo: artigo.conteudo })
    porSecao.set(artigo.secao, lista)
  }

  const secoes = Array.from(porSecao.entries()).map(([secao, lista]) => ({
    secao,
    artigos: lista,
  }))

  return NextResponse.json({
    secoes,
    total: artigos?.length ?? 0,
  })
}
