import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { atualizarEvento, cancelarEvento } from "@/lib/google-calendar"
import { agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"
import { validarSlotManual } from "@/lib/agendamento/validar-slot"

const schema = z.object({
  agendamentoId: z.string().min(1),
  acao: z.enum(["remarcar", "cancelar"]),
  novaDataHora: z.string().min(10).optional(),
  novoSlotLabel: z.string().min(1).optional(),
  mensagemPaciente: z.string().min(1).optional(),
})

function parseDataBanco(valor: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(valor) ? valor : `${valor}Z`)
}

function formatarDataHora(valor: Date | string): string {
  const data = typeof valor === "string" ? parseDataBanco(valor) : valor
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data)
}

function normalizarObservacao(texto?: string | null): string {
  return texto?.trim() ?? ""
}

function anexarHistoricoObservacao(
  observacaoAtual: string | null | undefined,
  linha: string
): string {
  const atual = normalizarObservacao(observacaoAtual)
  return atual ? `${atual}\n---\n${linha}` : linha
}

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { agendamentoId, acao, novaDataHora, novoSlotLabel, mensagemPaciente } =
    parsed.data

  const { data: agendamentoExistente } = await supabaseAdmin
    .from("agendamentos")
    .select(
      "id, contatoId, procedimentoId, dataHora, duracao, googleEventId, googleEventUrl, sincronizado, status, realizadoEm, observacao, tipo"
    )
    .eq("id", agendamentoId)
    .maybeSingle()

  if (!agendamentoExistente) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (agendamentoExistente.realizadoEm) {
    return NextResponse.json(
      { error: "Agendamento já foi marcado como realizado" },
      { status: 409 }
    )
  }

  if (agendamentoExistente.status === "cancelado") {
    return NextResponse.json(
      { error: "Agendamento já está cancelado" },
      { status: 409 }
    )
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id")
    .eq("contatoId", agendamentoExistente.contatoId)
    .is("encerradaEm", null)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (acao === "remarcar") {
    if (!novaDataHora) {
      return NextResponse.json(
        { error: "novaDataHora é obrigatório para remarcar" },
        { status: 400 }
      )
    }

    const novaInicio = new Date(novaDataHora)
    const duracaoMin = agendamentoExistente.duracao ?? 60
    const validacao = await validarSlotManual(novaInicio, duracaoMin, agendamentoId)
    if (!validacao.ok) {
      return NextResponse.json(
        { error: validacao.motivo || "Horário indisponível" },
        { status: 400 }
      )
    }

    const observacao = anexarHistoricoObservacao(
      agendamentoExistente.observacao,
      [
        `Remarcado em ${formatarDataHora(new Date())}: de ${formatarDataHora(
          agendamentoExistente.dataHora
        )} para ${novoSlotLabel ?? formatarDataHora(novaInicio)} via WhatsApp.`,
        mensagemPaciente ? `Pedido do paciente: ${mensagemPaciente}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )

    const { data: agendamento, error } = await supabaseAdmin
      .from("agendamentos")
      .update({
        dataHora: novaInicio.toISOString(),
        status: "remarcado",
        observacao,
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
      const novoFim = new Date(novaInicio.getTime() + duracaoMin * 60_000)
      const ok = await atualizarEvento(agendamentoExistente.googleEventId, {
        descricao: observacao,
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

    await supabaseAdmin
      .from("contatos")
      .update({
        responsavelId: "usr-lucas",
        statusFunil: "consulta_agendada" as never,
        ultimaMovimentacaoEm: agora(),
        atualizadoEm: agora(),
      })
      .eq("id", agendamentoExistente.contatoId)

    if (conversa) {
      await supabaseAdmin
        .from("conversas")
        .update({
          etapa: "consulta_agendada" as never,
          modoConversa: "ia" as never,
          atendenteId: null,
          atualizadoEm: agora(),
        })
        .eq("id", conversa.id)
    }

    const { data: agendamentoAudit } = await supabaseAdmin
      .from("agendamentos")
      .select("*")
      .eq("id", agendamentoId)
      .maybeSingle()

    await registrarAuditLog({
      usuarioId: null,
      acao: "remarcar_agendamento_ia",
      entidade: "Agendamento",
      entidadeId: agendamentoId,
      dadosAntes: agendamentoExistente as unknown as Record<string, unknown>,
      dadosDepois: (agendamentoAudit ?? agendamento) as unknown as Record<
        string,
        unknown
      >,
    })

    return NextResponse.json({ agendamento, sincronizado })
  }

  const observacaoCancelamento = anexarHistoricoObservacao(
    agendamentoExistente.observacao,
    [
      `Cancelado em ${formatarDataHora(new Date())} via WhatsApp.`,
      mensagemPaciente ? `Pedido do paciente: ${mensagemPaciente}` : null,
    ]
      .filter(Boolean)
      .join(" ")
  )

  const { data: agendamento, error: cancelError } = await supabaseAdmin
    .from("agendamentos")
    .update({
      status: "cancelado",
      observacao: observacaoCancelamento,
      atualizadoEm: agora(),
    })
    .eq("id", agendamentoId)
    .select("*")
    .single()

  if (cancelError || !agendamento) {
    return NextResponse.json(
      { error: cancelError?.message || "Erro ao cancelar agendamento" },
      { status: 500 }
    )
  }

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

  await supabaseAdmin
    .from("contatos")
    .update({
      responsavelId: null,
      statusFunil: "agendamento" as never,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", agendamentoExistente.contatoId)

  if (conversa) {
    await supabaseAdmin
      .from("conversas")
      .update({
        etapa: "agendamento" as never,
        modoConversa: "ia" as never,
        atendenteId: null,
        atualizadoEm: agora(),
      })
      .eq("id", conversa.id)
  }

  const { data: agendamentoAudit } = await supabaseAdmin
    .from("agendamentos")
    .select("*")
    .eq("id", agendamentoId)
    .maybeSingle()

  await registrarAuditLog({
    usuarioId: null,
    acao: "cancelar_agendamento_ia",
    entidade: "Agendamento",
    entidadeId: agendamentoId,
    dadosAntes: agendamentoExistente as unknown as Record<string, unknown>,
    dadosDepois: (agendamentoAudit ?? agendamento) as unknown as Record<
      string,
      unknown
    >,
  })

  return NextResponse.json({ agendamento: agendamentoAudit ?? agendamento })
}
