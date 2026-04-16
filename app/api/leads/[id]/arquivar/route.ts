import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, arquivado")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const novoArquivado = !lead.arquivado

  const { data: leadAtualizado, error } = await supabaseAdmin
    .from("leads")
    .update({
      arquivado: novoArquivado,
      arquivadoEm: novoArquivado ? agora() : null,
      atualizadoEm: agora(),
    })
    .eq("id", id)
    .select("id, nome, arquivado, arquivadoEm")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(leadAtualizado)
}
