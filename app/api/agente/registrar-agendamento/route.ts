import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarEvento } from "@/lib/google-calendar"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    contatoId?: string
    conversaId?: string
    procedimentoId?: string
    dataHora?: string
    observacao?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { contatoId, conversaId, procedimentoId, dataHora, observacao } = body

  if (!contatoId || !conversaId || !dataHora) {
    return NextResponse.json(
      { error: "contatoId, conversaId e dataHora são obrigatórios" },
      { status: 400 }
    )
  }

  const inicio = new Date(dataHora)

  const { data: agendamento, error: agendError } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      contatoId,
      procedimentoId: procedimentoId || null,
      dataHora: inicio.toISOString(),
      status: "agendado",
      observacao: observacao || null,
    })
    .select("*")
    .single()

  if (agendError || !agendamento) {
    return NextResponse.json(
      { error: agendError?.message || "Erro ao criar agendamento" },
      { status: 500 }
    )
  }

  await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: "consulta_agendada",
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", contatoId)

  await supabaseAdmin
    .from("conversas")
    .update({ etapa: "consulta_agendada", atualizadoEm: agora() })
    .eq("id", conversaId)

  const [{ data: lead }, procResult] = await Promise.all([
    supabaseAdmin
      .from("contatos")
      .select("nome, email, whatsapp")
      .eq("id", contatoId)
      .maybeSingle(),
    procedimentoId
      ? supabaseAdmin
          .from("procedimentos")
          .select("nome, duracaoMin")
          .eq("id", procedimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const procedimento = procResult.data

  const duracaoMin = procedimento?.duracaoMin ?? agendamento.duracao ?? 60
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000)
  const tituloEvento = procedimento
    ? `Consulta — ${procedimento.nome} (${lead?.nome ?? "Paciente"})`
    : `Consulta — ${lead?.nome ?? "Paciente"}`
  const descricaoEvento = [
    `Paciente: ${lead?.nome ?? "-"}`,
    lead?.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
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
    emailPaciente: lead?.email ?? undefined,
  })

  if (resultadoCalendar) {
    await supabaseAdmin
      .from("agendamentos")
      .update({
        googleEventId: resultadoCalendar.googleEventId,
        googleEventUrl: resultadoCalendar.googleEventUrl,
        sincronizado: true,
        duracao: duracaoMin,
        atualizadoEm: agora(),
      })
      .eq("id", agendamento.id)
  }

  return NextResponse.json({ agendamento, sincronizado: !!resultadoCalendar })
}
