import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarEvento, cancelarEvento } from "@/lib/google-calendar"
import { agora } from "@/lib/db-utils"

const SELECT_FULL =
  "*, lead:leads!agendamentos_leadId_fkey(nome, whatsapp, email), procedimento:procedimentos(nome, duracaoMin)"

const SELECT_RESUMIDO =
  "*, lead:leads!agendamentos_leadId_fkey(nome, whatsapp), procedimento:procedimentos(nome)"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: agendamento } = await supabaseAdmin
    .from("agendamentos")
    .select(SELECT_FULL)
    .eq("id", id)
    .maybeSingle()

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  return NextResponse.json(agendamento)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await req.json()
  const { status, dataHora, duracao, observacao, procedimentoId } = body

  const { data: agendamentoAtual } = await supabaseAdmin
    .from("agendamentos")
    .select("id, dataHora, duracao, googleEventId")
    .eq("id", id)
    .maybeSingle()

  if (!agendamentoAtual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  const novaDataHora = dataHora ? new Date(dataHora) : new Date(agendamentoAtual.dataHora)
  const novaDuracao = duracao ?? agendamentoAtual.duracao

  if (agendamentoAtual.googleEventId) {
    if (status === "cancelado") {
      await cancelarEvento(agendamentoAtual.googleEventId)
    } else if (dataHora || duracao) {
      const fim = new Date(novaDataHora.getTime() + novaDuracao * 60 * 1000)
      await atualizarEvento(agendamentoAtual.googleEventId, {
        inicio: novaDataHora,
        fim,
      })
    }
  }

  const dadosUpdate: Record<string, unknown> = { atualizadoEm: agora() }
  if (status) dadosUpdate.status = status
  if (dataHora) dadosUpdate.dataHora = novaDataHora.toISOString()
  if (duracao !== undefined) dadosUpdate.duracao = novaDuracao
  if (observacao !== undefined) dadosUpdate.observacao = observacao
  if (procedimentoId !== undefined) dadosUpdate.procedimentoId = procedimentoId || null

  const { data: atualizado, error } = await supabaseAdmin
    .from("agendamentos")
    .update(dadosUpdate)
    .eq("id", id)
    .select(SELECT_RESUMIDO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(atualizado)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: agendamento } = await supabaseAdmin
    .from("agendamentos")
    .select("id, googleEventId")
    .eq("id", id)
    .maybeSingle()

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (agendamento.googleEventId) {
    await cancelarEvento(agendamento.googleEventId)
  }

  const { error } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "cancelado", atualizadoEm: agora() })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
