import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { buscarAgendamentosParaConfirmacao } from "@/lib/agente/confirmacao"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"

/**
 * Endpoint de diagnostico operacional — agendamentos, cron, analista.
 * GET /api/agente/debug-status — read-only, requer login do painel.
 */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // 1. Agendamentos ativos (passado + futuro proximo)
  const agora = new Date()
  const ontemMeiaNoite = new Date(agora)
  ontemMeiaNoite.setDate(ontemMeiaNoite.getDate() - 1)
  ontemMeiaNoite.setHours(0, 0, 0, 0)
  const em7dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: agendamentos } = await supabaseAdmin
    .from("agendamentos")
    .select("id, dataHora, status, criadoPor, confirmacoesEnviadas, contatoId")
    .gte("dataHora", ontemMeiaNoite.toISOString())
    .lte("dataHora", em7dias.toISOString())
    .order("dataHora", { ascending: true })

  // 2. Buscar pendentes pra confirmacao (mesmo criterio do cron)
  const pendentes = await buscarAgendamentosParaConfirmacao()

  // 3. Eduarda — ultimas 10 analises (output e Json com todas sugestoes)
  const { data: analistaLogs } = await supabaseAdmin
    .from("analista_logs")
    .select("id, contatoId, criadoEm, aplicado, confiancaGeral, output, divergencias, erro")
    .order("criadoEm", { ascending: false })
    .limit(10)

  // 4. Tabela analista_logs existe e tem dados?
  const { count: totalAnalises } = await supabaseAdmin
    .from("analista_logs")
    .select("*", { count: "exact", head: true })

  // 5. Cron horario comercial (se cron rodaria agora)
  const horarioOK = ehHorarioComercial()

  return NextResponse.json({
    agoraServidor: agora.toISOString(),
    horarioComercialAgora: horarioOK,
    cronJanela: {
      explicacao:
        "Cron busca agendamentos com dataHora entre AGORA e AGORA+4h, status agendado|remarcado, criadoPor=ia. Janelas: 3h/1h/30min antes.",
      pendentesAgora: pendentes.length,
      pendentesDetalhes: pendentes.map((p) => ({
        agendamentoId: p.agendamento.id,
        dataHora: p.agendamento.dataHora,
        tipo: p.tipo,
        confirmacoesJaEnviadas: p.agendamento.confirmacoesEnviadas,
        contato: { nome: p.agendamento.contato.nome, whatsapp: p.agendamento.contato.whatsapp },
      })),
    },
    agendamentos: {
      total: agendamentos?.length ?? 0,
      lista: agendamentos ?? [],
    },
    eduarda: {
      totalAnalisesNaTabela: totalAnalises ?? 0,
      ultimas10: (analistaLogs ?? []).map((a) => ({
        id: a.id,
        criadoEm: a.criadoEm,
        contatoId: a.contatoId,
        aplicado: a.aplicado,
        confiancaGeral: a.confiancaGeral,
        erro: a.erro,
        output: a.output,
        divergencias: a.divergencias,
      })),
    },
  })
}
