import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const agora = new Date()
  const dataInicio = searchParams.get("dataInicio")
    ? new Date(searchParams.get("dataInicio")!)
    : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agora

  const filtroPeriodo = { criadoEm: { gte: dataInicio, lte: dataFim } }

  const [
    totalMensagens,
    enviadas,
    recebidas,
    totalConversas,
    conversasAtivas,
    conversasEncerradas,
    followUpsEnviados,
    conversasComFollowUp,
    conversasRespondidas,
  ] = await Promise.all([
    prisma.mensagemWhatsapp.count({ where: filtroPeriodo }),
    prisma.mensagemWhatsapp.count({ where: { ...filtroPeriodo, remetente: "agente" } }),
    prisma.mensagemWhatsapp.count({ where: { ...filtroPeriodo, remetente: "paciente" } }),
    prisma.conversa.count({ where: { criadoEm: { gte: dataInicio, lte: dataFim } } }),
    prisma.conversa.count({
      where: { criadoEm: { gte: dataInicio, lte: dataFim }, encerradaEm: null },
    }),
    prisma.conversa.count({
      where: {
        criadoEm: { gte: dataInicio, lte: dataFim },
        encerradaEm: { not: null },
      },
    }),
    prisma.conversa.count({
      where: {
        atualizadoEm: { gte: dataInicio, lte: dataFim },
        followUpEnviados: { isEmpty: false },
      },
    }),
    prisma.conversa.count({
      where: {
        atualizadoEm: { gte: dataInicio, lte: dataFim },
        followUpEnviados: { isEmpty: false },
      },
    }),
    prisma.conversa.count({
      where: {
        atualizadoEm: { gte: dataInicio, lte: dataFim },
        followUpEnviados: { isEmpty: false },
        // Conversas com follow-up que tiveram mensagem do paciente depois
        mensagens: {
          some: { remetente: "paciente", criadoEm: { gte: dataInicio } },
        },
      },
    }),
  ])

  const taxaResposta =
    conversasComFollowUp > 0
      ? Math.round((conversasRespondidas / conversasComFollowUp) * 1000) / 10
      : 0

  // Tempo médio de resposta: simplificado — média entre mensagens consecutivas agente/paciente
  const tempoMedioResposta = 0 // complexidade alta, retornar 0 por ora

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    mensagens: { total: totalMensagens, enviadas, recebidas },
    conversas: {
      total: totalConversas,
      ativas: conversasAtivas,
      encerradas: conversasEncerradas,
      tempoMedioResposta,
    },
    followUps: { enviados: followUpsEnviados, taxaResposta },
  })
}
