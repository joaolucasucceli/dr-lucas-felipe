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
    : new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agora

  // Ajustar dataFim para incluir o dia inteiro
  const dataFimDia = new Date(dataFim)
  dataFimDia.setHours(23, 59, 59, 999)

  const filtroPeriodo = { criadoEm: { gte: dataInicio, lte: dataFimDia } }

  // Buscar usuário IA (Ana Júlia)
  const anaJulia = await prisma.usuario.findFirst({
    where: { tipo: "ia", deletadoEm: null },
    select: { id: true },
  })

  const [
    totalMensagens,
    enviadas,
    recebidas,
    totalConversas,
    conversasAtivas,
    conversasEncerradas,
  ] = await Promise.all([
    prisma.mensagemWhatsapp.count({ where: filtroPeriodo }),
    prisma.mensagemWhatsapp.count({ where: { ...filtroPeriodo, remetente: "agente" } }),
    prisma.mensagemWhatsapp.count({ where: { ...filtroPeriodo, remetente: "paciente" } }),
    prisma.conversa.count({ where: filtroPeriodo }),
    prisma.conversa.count({ where: { ...filtroPeriodo, encerradaEm: null } }),
    prisma.conversa.count({ where: { ...filtroPeriodo, encerradaEm: { not: null } } }),
  ])

  // Funil — leads gerenciados pela Ana Júlia no período
  let funil = { leadsRecebidos: 0, qualificados: 0, agendados: 0, realizados: 0 }
  if (anaJulia) {
    const leadsIA = await prisma.lead.findMany({
      where: {
        responsavelId: anaJulia.id,
        criadoEm: { gte: dataInicio, lte: dataFimDia },
        deletadoEm: null,
      },
      select: { statusFunil: true },
    })

    const etapasQualificado = new Set([
      "agendamento",
      "consulta_agendada",
      "consulta_realizada",
      "sinal_pago",
      "procedimento_agendado",
      "concluido",
    ])
    const etapasAgendado = new Set([
      "consulta_agendada",
      "consulta_realizada",
      "sinal_pago",
      "procedimento_agendado",
      "concluido",
    ])
    const etapasRealizado = new Set([
      "consulta_realizada",
      "sinal_pago",
      "procedimento_agendado",
      "concluido",
    ])

    funil = {
      leadsRecebidos: leadsIA.length,
      qualificados: leadsIA.filter((l) => etapasQualificado.has(l.statusFunil)).length,
      agendados: leadsIA.filter((l) => etapasAgendado.has(l.statusFunil)).length,
      realizados: leadsIA.filter((l) => etapasRealizado.has(l.statusFunil)).length,
    }
  }

  // Follow-ups enviados — contagem por tipo
  const conversasPeriodo = await prisma.conversa.findMany({
    where: { atualizadoEm: { gte: dataInicio, lte: dataFimDia } },
    select: { followUpEnviados: true },
  })

  let f1h = 0, f6h = 0, f24h = 0
  for (const c of conversasPeriodo) {
    if (c.followUpEnviados.includes("1h")) f1h++
    if (c.followUpEnviados.includes("6h")) f6h++
    if (c.followUpEnviados.includes("24h")) f24h++
  }

  // Confirmações de agendamentos enviadas — contagem por tipo
  const agendamentosPeriodo = await prisma.agendamento.findMany({
    where: { criadoEm: { gte: dataInicio, lte: dataFimDia } },
    select: { confirmacoesEnviadas: true },
  })

  let c6h = 0, c3h = 0, c30min = 0
  for (const a of agendamentosPeriodo) {
    if (a.confirmacoesEnviadas.includes("6h")) c6h++
    if (a.confirmacoesEnviadas.includes("3h")) c3h++
    if (a.confirmacoesEnviadas.includes("30min")) c30min++
  }

  // Atividade por dia (mensagens agrupadas por data)
  type AtividadeDiaRaw = { data: Date; enviadas: bigint; recebidas: bigint }
  const atividadeRaw = await prisma.$queryRaw<AtividadeDiaRaw[]>`
    SELECT
      DATE_TRUNC('day', "criadoEm" AT TIME ZONE 'America/Sao_Paulo') AS data,
      COUNT(*) FILTER (WHERE remetente = 'agente') AS enviadas,
      COUNT(*) FILTER (WHERE remetente = 'paciente') AS recebidas
    FROM mensagens_whatsapp
    WHERE "criadoEm" >= ${dataInicio} AND "criadoEm" <= ${dataFimDia}
    GROUP BY 1
    ORDER BY 1 ASC
  `

  const atividadePorDia = atividadeRaw.map((row) => ({
    data: row.data.toISOString().slice(0, 10),
    enviadas: Number(row.enviadas),
    recebidas: Number(row.recebidas),
  }))

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFimDia.toISOString() },
    mensagens: { total: totalMensagens, enviadas, recebidas },
    conversas: { total: totalConversas, ativas: conversasAtivas, encerradas: conversasEncerradas },
    funil,
    followUps: { f1h, f6h, f24h },
    confirmacoes: { c6h, c3h, c30min },
    atividadePorDia,
  })
}
