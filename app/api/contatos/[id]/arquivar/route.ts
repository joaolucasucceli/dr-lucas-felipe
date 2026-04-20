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

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, arquivado")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const novoArquivado = !contato.arquivado

  const { data: atualizado, error } = await supabaseAdmin
    .from("contatos")
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

  return NextResponse.json(atualizado)
}
