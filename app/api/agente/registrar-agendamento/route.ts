import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarEvento } from "@/lib/google-calendar"
import { criarId, agora } from "@/lib/db-utils"
import { validarSlotManual } from "@/lib/agendamento/validar-slot"

const schema = z.object({
  contatoId: z.string().min(1),
  conversaId: z.string().min(1),
  procedimentoId: z.string().min(1).optional(),
  // EXIGE timezone explicito (Z ou +/-HH:MM). Senao a IA pode passar
  // "2026-04-28T08:00:00" sem TZ e o servidor (UTC) interpreta como
  // 08:00Z = 05:00 SP, agendando 4h antes do que o paciente escolheu.
  dataHora: z.string().datetime({ offset: true }),
  observacao: z.string().optional(),
  // Email OBRIGATORIO — sem ele o Google Calendar nao manda convite e o
  // paciente fica sem confirmacao por email. Decisao de produto: nao
  // criamos agendamento sem email valido.
  email: z.string().email(),
})

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

  const { contatoId, conversaId, procedimentoId, dataHora, observacao, email } = parsed.data

  const inicio = new Date(dataHora)

  // Mesma validacao do POST manual: bloqueia conflito, fora-de-expediente,
  // feriado, data passada. Combinado com executarFerramenta retornando
  // { ok: false } em 4xx, a IA recebe motivo e pode oferecer outro slot.
  const validacao = await validarSlotManual(inicio, 60)
  if (!validacao.ok) {
    return NextResponse.json({ error: validacao.motivo }, { status: 400 })
  }

  // Se IA passou email, salva no contato pra reuso (Google Calendar invite,
  // futura comunicacao). Antes de criar evento, pra garantir que a busca
  // de email logo abaixo ja pegue o valor atualizado.
  if (email) {
    await supabaseAdmin
      .from("contatos")
      .update({ email, atualizadoEm: agora() })
      .eq("id", contatoId)
  }

  // Fallback de procedimento: se IA nao passou procedimentoId, tenta
  // resolver pelo procedimentoInteresse ja gravado pela Eduarda.
  let finalProcedimentoId = procedimentoId
  if (!finalProcedimentoId) {
    const { data: contatoProc } = await supabaseAdmin
      .from("contatos")
      .select("procedimentoInteresse")
      .eq("id", contatoId)
      .maybeSingle()
    const interesse = contatoProc?.procedimentoInteresse?.trim()
    if (interesse) {
      const { data: proc } = await supabaseAdmin
        .from("procedimentos")
        .select("id")
        .ilike("nome", `%${interesse}%`)
        .eq("ativo", true)
        .is("deletadoEm", null)
        .limit(1)
        .maybeSingle()
      if (proc?.id) finalProcedimentoId = proc.id
    }
  }

  const { data: agendamento, error: agendError } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      contatoId,
      procedimentoId: finalProcedimentoId || null,
      dataHora: inicio.toISOString(),
      status: "agendado",
      observacao: observacao || null,
      criadoPor: "ia",
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
    finalProcedimentoId
      ? supabaseAdmin
          .from("procedimentos")
          .select("nome")
          .eq("id", finalProcedimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const procedimento = procResult.data

  // Avaliacao online com Dr. Lucas e SEMPRE 60min — duracao do procedimento
  // refere-se a cirurgia (info clinica), nao ao slot de reuniao.
  const duracaoMin = 60
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000)
  const tituloEvento = procedimento
    ? `Avaliação — ${procedimento.nome} (${lead?.nome ?? "Paciente"})`
    : `Avaliação — ${lead?.nome ?? "Paciente"}`
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
