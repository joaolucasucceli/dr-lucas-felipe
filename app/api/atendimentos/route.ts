import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()
  const { leadId } = body

  if (!leadId) {
    return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 })
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, statusFunil, cicloAtual, ciclosCompletos")
    .eq("id", leadId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  if (lead.statusFunil !== "concluido" && lead.statusFunil !== "perdido") {
    return NextResponse.json(
      { error: "Lead já possui atendimento em andamento" },
      { status: 409 }
    )
  }

  const novoCiclo = lead.cicloAtual + 1
  const tsAgora = agora()

  const { error: leadError } = await supabaseAdmin
    .from("leads")
    .update({
      cicloAtual: novoCiclo,
      ciclosCompletos: lead.ciclosCompletos + 1,
      ehRetorno: true,
      statusFunil: "acolhimento",
      motivoPerda: null,
      ultimaMovimentacaoEm: tsAgora,
      atualizadoEm: tsAgora,
    })
    .eq("id", leadId)

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 })
  }

  const { error: convError } = await supabaseAdmin
    .from("conversas")
    .insert({
      id: criarId(),
      atualizadoEm: tsAgora,
      leadId,
      ciclo: novoCiclo,
      etapa: "acolhimento",
    })

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
