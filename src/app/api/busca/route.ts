import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q") ?? ""

  if (q.length < 2) {
    return NextResponse.json({ contatos: [], procedimentos: [], total: 0 })
  }

  const [
    { data: contatos },
    { data: procedimentos },
  ] = await Promise.all([
    supabaseAdmin
      .from("contatos")
      .select("id, nome, whatsapp, statusFunil")
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .or(`nome.ilike.%${q}%,whatsapp.ilike.%${q}%`)
      .limit(5),
    supabaseAdmin
      .from("procedimentos")
      .select("id, nome, ativo")
      .is("deletadoEm", null)
      .ilike("nome", `%${q}%`)
      .limit(5),
  ])

  const contatosList = contatos ?? []
  const procedimentosList = procedimentos ?? []

  return NextResponse.json({
    contatos: contatosList,
    procedimentos: procedimentosList,
    total: contatosList.length + procedimentosList.length,
  })
}
