import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAnyRole } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<unknown> }

function extrairId(params: unknown): string | null {
  if (
    typeof params === "object" &&
    params !== null &&
    "id" in params &&
    typeof params.id === "string"
  ) {
    return params.id
  }

  return null
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const id = extrairId(await params)
  if (!id) {
    return NextResponse.json({ error: "Agendamento inválido" }, { status: 400 })
  }

  const { data: agendamento } = await supabaseAdmin
    .from("agendamentos")
    .select("id, contatoId, status, dataHora, realizadoEm, realizadoPor")
    .eq("id", id)
    .maybeSingle()

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (agendamento.realizadoEm) {
    return NextResponse.json(
      { error: "Agendamento já marcado como realizado" },
      { status: 409 }
    )
  }

  if (!["agendado", "remarcado"].includes(agendamento.status)) {
    return NextResponse.json(
      { error: "Apenas agendamentos ativos podem ser marcados como realizados" },
      { status: 400 }
    )
  }

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo, statusFunil, responsavelId")
    .eq("id", agendamento.contatoId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const perfil = auth.session.user.perfil
  if (perfil === "atendente" && contato.responsavelId !== auth.session.user.id) {
    return NextResponse.json(
      { error: "Sem permissão para concluir este atendimento" },
      { status: 403 }
    )
  }

  const tsAgora = agora()

  const { data: agendamentoAtualizado, error: erroAgendamento } = await supabaseAdmin
    .from("agendamentos")
    .update({
      realizadoEm: tsAgora,
      realizadoPor: auth.session.user.id,
      atualizadoEm: tsAgora,
    } as never)
    .eq("id", id)
    .is("realizadoEm", null)
    .select("id, contatoId, status, dataHora, realizadoEm, realizadoPor")
    .maybeSingle()

  if (erroAgendamento || !agendamentoAtualizado) {
    return NextResponse.json(
      { error: erroAgendamento?.message || "Agendamento já marcado como realizado" },
      { status: erroAgendamento ? 500 : 409 }
    )
  }

  const { data: conversaAberta } = await supabaseAdmin
    .from("conversas")
    .select("id")
    .eq("contatoId", contato.id)
    .is("encerradaEm", null)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: contatoAtualizado, error } = await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: "atendimento_humano" as never,
      responsavelId: "usr-lucas",
      ultimaMovimentacaoEm: tsAgora,
      atualizadoEm: tsAgora,
    } as never)
    .eq("id", contato.id)
    .select("id, nome, statusFunil, responsavelId")
    .single()

  if (error || !contatoAtualizado) {
    return NextResponse.json(
      { error: error?.message || "Erro ao concluir atendimento" },
      { status: 500 }
    )
  }

  if (conversaAberta) {
    await supabaseAdmin
      .from("conversas")
      .update({
        etapa: "atendimento_humano" as never,
        modoConversa: "humano" as never,
        atendenteId: "usr-lucas",
        atualizadoEm: tsAgora,
      } as never)
      .eq("id", conversaAberta.id)
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "marcar_atendimento_realizado",
    entidade: "Agendamento",
    entidadeId: id,
    dadosAntes: {
      agendamento,
      contato,
      conversaId: conversaAberta?.id ?? null,
    },
    dadosDepois: {
      agendamento: agendamentoAtualizado,
      contato: contatoAtualizado,
      conversaId: conversaAberta?.id ?? null,
    },
  })

  return NextResponse.json({
    sucesso: true,
    agendamento: agendamentoAtualizado,
    contato: contatoAtualizado,
    conversaId: conversaAberta?.id ?? null,
  })
}
