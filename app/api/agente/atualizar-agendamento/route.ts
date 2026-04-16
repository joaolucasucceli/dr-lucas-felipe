import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { atualizarEvento, cancelarEvento } from "@/lib/google-calendar"
import { agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    agendamentoId?: string
    acao?: string
    novaDataHora?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { agendamentoId, acao, novaDataHora } = body

  if (!agendamentoId || !acao) {
    return NextResponse.json(
      { error: "agendamentoId e acao são obrigatórios" },
      { status: 400 }
    )
  }

  if (acao !== "remarcar" && acao !== "cancelar") {
    return NextResponse.json(
      { error: "acao deve ser 'remarcar' ou 'cancelar'" },
      { status: 400 }
    )
  }

  const { data: agendamentoExistente } = await supabaseAdmin
    .from("agendamentos")
    .select("id, leadId, duracao, googleEventId, sincronizado")
    .eq("id", agendamentoId)
    .maybeSingle()

  if (!agendamentoExistente) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (acao === "remarcar") {
    if (!novaDataHora) {
      return NextResponse.json(
        { error: "novaDataHora é obrigatório para remarcar" },
        { status: 400 }
      )
    }

    const novaInicio = new Date(novaDataHora)

    const { data: agendamento, error } = await supabaseAdmin
      .from("agendamentos")
      .update({
        dataHora: novaInicio.toISOString(),
        status: "remarcado",
        atualizadoEm: agora(),
      })
      .eq("id", agendamentoId)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let sincronizado = agendamentoExistente.sincronizado
    if (agendamentoExistente.googleEventId) {
      const duracaoMin = agendamentoExistente.duracao ?? 60
      const novoFim = new Date(novaInicio.getTime() + duracaoMin * 60_000)
      const ok = await atualizarEvento(agendamentoExistente.googleEventId, {
        inicio: novaInicio,
        fim: novoFim,
      })
      if (!ok) {
        sincronizado = false
        await supabaseAdmin
          .from("agendamentos")
          .update({ sincronizado: false, atualizadoEm: agora() })
          .eq("id", agendamentoId)
      }
    }

    return NextResponse.json({ agendamento, sincronizado })
  }

  const { data: agendamento } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "cancelado", atualizadoEm: agora() })
    .eq("id", agendamentoId)
    .select("*")
    .single()

  if (agendamentoExistente.googleEventId) {
    await cancelarEvento(agendamentoExistente.googleEventId)
    await supabaseAdmin
      .from("agendamentos")
      .update({
        googleEventId: null,
        googleEventUrl: null,
        sincronizado: false,
        atualizadoEm: agora(),
      })
      .eq("id", agendamentoId)
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id")
    .eq("leadId", agendamentoExistente.leadId)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabaseAdmin
    .from("leads")
    .update({
      statusFunil: "pre_agendamento" as never,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", agendamentoExistente.leadId)

  if (conversa) {
    await supabaseAdmin
      .from("conversas")
      .update({ etapa: "pre_agendamento" as never, atualizadoEm: agora() })
      .eq("id", conversa.id)
  }

  return NextResponse.json({ agendamento })
}
