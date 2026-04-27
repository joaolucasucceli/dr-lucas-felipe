import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarAgendamentoSchema } from "@/lib/validations/agendamento"
import { atualizarEvento, cancelarEvento } from "@/lib/google-calendar"
import { agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"
import { validarSlotManual } from "@/lib/agendamento/validar-slot"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = atualizarAgendamentoSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: atual, error: errAtual } = await supabaseAdmin
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (errAtual || !atual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  // Se dataHora foi mexida, valida expediente/feriado/conflito (ignorando
  // o proprio agendamento pra nao conflitar consigo mesmo).
  if (parsed.data.dataHora) {
    const novaInicio = new Date(parsed.data.dataHora)
    const novaDuracao = parsed.data.duracao ?? atual.duracao ?? 60
    const validacao = await validarSlotManual(novaInicio, novaDuracao, id)
    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.motivo }, { status: 400 })
    }
  }

  const dadosUpdate: Record<string, unknown> = {
    ...parsed.data,
    atualizadoEm: agora(),
  }

  if (parsed.data.dataHora) {
    dadosUpdate.dataHora = new Date(parsed.data.dataHora).toISOString()
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from("agendamentos")
    .update(dadosUpdate as never)
    .eq("id", id)
    .select("*")
    .single()

  if (error || !atualizado) {
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar agendamento" },
      { status: 500 }
    )
  }

  // Se mudou dataHora ou duração, ressincronizar Google Calendar
  const dataHoraMudou = parsed.data.dataHora && parsed.data.dataHora !== atual.dataHora
  const duracaoMudou = parsed.data.duracao !== undefined && parsed.data.duracao !== atual.duracao

  if (atualizado.googleEventId && (dataHoraMudou || duracaoMudou)) {
    const inicio = new Date(atualizado.dataHora)
    const fim = new Date(inicio.getTime() + (atualizado.duracao ?? 60) * 60_000)
    await atualizarEvento(atualizado.googleEventId, { inicio, fim })
  }

  // Ao marcar como realizada, transfere responsabilidade do contato pro
  // usuario que clicou (geralmente o gestor que conduziu a reuniao). Antes
  // o contato ficava com a Ana Julia mesmo apos a consulta acontecer.
  if (parsed.data.status === "realizado" && atual.status !== "realizado") {
    await supabaseAdmin
      .from("contatos")
      .update({ responsavelId: auth.session.user.id, atualizadoEm: agora() })
      .eq("id", atualizado.contatoId)
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Agendamento",
    entidadeId: id,
    dadosAntes: atual as unknown as Record<string, unknown>,
    dadosDepois: atualizado as unknown as Record<string, unknown>,
  })

  return NextResponse.json(atualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: atual } = await supabaseAdmin
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!atual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  // Soft-cancel: marca status='cancelado', mantém row pra histórico
  const { data: cancelado, error } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "cancelado", atualizadoEm: agora() } as never)
    .eq("id", id)
    .select("*")
    .single()

  if (error || !cancelado) {
    return NextResponse.json(
      { error: error?.message || "Erro ao cancelar agendamento" },
      { status: 500 }
    )
  }

  if (atual.googleEventId) {
    await cancelarEvento(atual.googleEventId)
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "cancelar",
    entidade: "Agendamento",
    entidadeId: id,
    dadosAntes: atual as unknown as Record<string, unknown>,
    dadosDepois: cancelado as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ mensagem: "Agendamento cancelado" })
}
