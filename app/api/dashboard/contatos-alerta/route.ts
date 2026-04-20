import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const ha3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: contatos, count } = await supabaseAdmin
    .from("contatos")
    .select(
      "id, nome, statusFunil, ultimaMovimentacaoEm, atualizadoEm, procedimentoInteresse",
      { count: "exact" }
    )
    .is("deletadoEm", null)
    .eq("tipo", "lead")
    .eq("arquivado", false)
    .or(
      `ultimaMovimentacaoEm.lt.${ha3dias},and(ultimaMovimentacaoEm.is.null,atualizadoEm.lt.${ha3dias})`
    )
    .order("atualizadoEm", { ascending: true })
    .limit(5)

  return NextResponse.json({ contatos: contatos ?? [], total: count ?? 0 })
}
