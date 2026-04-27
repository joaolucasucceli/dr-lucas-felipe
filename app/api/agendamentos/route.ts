import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAnyRole } from "@/lib/auth-helpers"
import { criarAgendamentoSchema, ROTULOS_TIPO_AGENDAMENTO } from "@/lib/validations/agendamento"
import { criarEvento } from "@/lib/google-calendar"
import { criarId, agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = criarAgendamentoSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { contatoId, procedimentoId, dataHora, observacao, status } = parsed.data

  // A clinica so faz avaliacao online com Dr. Lucas (1h fixa). Tipo e
  // duracao sao forcados aqui pra evitar bypass do form.
  const tipo = "consulta_online" as const
  const duracao = 60
  const inicio = new Date(dataHora)

  const tsAgora = agora()

  const { data: agendamento, error } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      id: criarId(),
      contatoId,
      procedimentoId: procedimentoId || null,
      tipo,
      dataHora: inicio.toISOString(),
      duracao,
      status,
      observacao: observacao || null,
      atualizadoEm: tsAgora,
    } as never)
    .select("*")
    .single()

  if (error || !agendamento) {
    return NextResponse.json(
      { error: error?.message || "Erro ao criar agendamento" },
      { status: 500 }
    )
  }

  const [{ data: contato }, procResult] = await Promise.all([
    supabaseAdmin
      .from("contatos")
      .select("nome, email, whatsapp")
      .eq("id", contatoId)
      .maybeSingle(),
    procedimentoId
      ? supabaseAdmin
          .from("procedimentos")
          .select("nome")
          .eq("id", procedimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const procedimento = procResult.data
  const fim = new Date(inicio.getTime() + duracao * 60_000)
  const rotuloTipo = ROTULOS_TIPO_AGENDAMENTO[tipo]
  const tituloEvento = procedimento
    ? `${rotuloTipo} — ${procedimento.nome} (${contato?.nome ?? "Paciente"})`
    : `${rotuloTipo} — ${contato?.nome ?? "Paciente"}`
  const descricaoEvento = [
    `Tipo: ${rotuloTipo}`,
    `Paciente: ${contato?.nome ?? "-"}`,
    contato?.whatsapp ? `WhatsApp: ${contato.whatsapp}` : null,
    procedimento ? `Procedimento: ${procedimento.nome}` : null,
    observacao ? `Observação: ${observacao}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const resultadoCalendar = await criarEvento({
    titulo: tituloEvento,
    descricao: descricaoEvento,
    inicio,
    fim,
    emailPaciente: contato?.email ?? undefined,
  })

  let agendamentoFinal = agendamento
  if (resultadoCalendar) {
    const { data: atualizado } = await supabaseAdmin
      .from("agendamentos")
      .update({
        googleEventId: resultadoCalendar.googleEventId,
        googleEventUrl: resultadoCalendar.googleEventUrl,
        sincronizado: true,
        atualizadoEm: agora(),
      })
      .eq("id", agendamento.id)
      .select("*")
      .single()
    if (atualizado) agendamentoFinal = atualizado
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "Agendamento",
    entidadeId: agendamento.id,
    dadosDepois: agendamentoFinal as unknown as Record<string, unknown>,
  })

  return NextResponse.json(
    { agendamento: agendamentoFinal, sincronizado: !!resultadoCalendar },
    { status: 201 }
  )
}
